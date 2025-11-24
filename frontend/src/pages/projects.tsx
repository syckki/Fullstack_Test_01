import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Users, Trash2, Edit, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProjectWithCreator, User } from "@shared/schema";

const projectSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(200),
  description: z.string().optional(),
});

type ProjectForm = z.infer<typeof projectSchema>;

function ProjectFormDialog({ project, onClose }: { project?: ProjectWithCreator; onClose: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isEdit = !!project;

  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>(
    project?.collaborators?.map(c => c.id) || []
  );

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ProjectForm) => {
      if (isEdit) {
        return apiRequest("PATCH", `/api/projects/${project.id}`, data);
      }
      return apiRequest("POST", "/api/projects", data);
    },
    onSuccess: async (createdOrUpdatedProject: any) => {
      const projectId = isEdit ? project.id : createdOrUpdatedProject.id;
      const creatorId = isEdit ? project.creatorId : user?.id;

      try {
        // Sync collaborators (exclude creator from collaborator operations)
        if (isEdit) {
          const currentCollaborators = project.collaborators?.map(c => c.id).filter(id => id !== creatorId) || [];
          const selectedNonCreators = selectedCollaborators.filter(id => id !== creatorId);
          
          const toAdd = selectedNonCreators.filter(id => !currentCollaborators.includes(id));
          const toRemove = currentCollaborators.filter(id => !selectedNonCreators.includes(id));

          // Execute all operations in parallel
          const addPromises = toAdd.map(userId =>
            apiRequest("POST", `/api/projects/${projectId}/collaborators`, { userId })
          );
          const removePromises = toRemove.map(userId =>
            apiRequest("DELETE", `/api/projects/${projectId}/collaborators/${userId}`, undefined)
          );

          await Promise.all([...addPromises, ...removePromises]);
        } else {
          // Adding collaborators to new project in parallel (exclude creator)
          const selectedNonCreators = selectedCollaborators.filter(id => id !== creatorId);
          const addPromises = selectedNonCreators.map(userId =>
            apiRequest("POST", `/api/projects/${projectId}/collaborators`, { userId })
          );
          await Promise.all(addPromises);
        }

        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        toast({
          title: isEdit ? "Proyecto actualizado" : "Proyecto creado",
          description: isEdit ? "El proyecto se actualizó correctamente" : "El proyecto se creó correctamente",
        });
        onClose();
      } catch (error: any) {
        // Invalidate queries to refetch and show actual state
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        toast({
          variant: "destructive",
          title: "Error al sincronizar colaboradores",
          description: error.message || "Algunos colaboradores no pudieron ser actualizados. Los datos se han recargado.",
        });
        onClose();
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo guardar el proyecto",
      });
    },
  });

  const toggleCollaborator = (userId: string) => {
    setSelectedCollaborators(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const availableUsers = users?.filter(u => u.id !== user?.id) || [];

  return (
    <DialogContent className="max-w-2xl" data-testid="dialog-project-form">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar Proyecto" : "Crear Proyecto"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "Modifica los detalles del proyecto" : "Completa los detalles para crear un nuevo proyecto"}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del proyecto</FormLabel>
                <FormControl>
                  <Input placeholder="Proyecto increíble" data-testid="input-project-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe brevemente el proyecto..."
                    rows={4}
                    data-testid="input-project-description"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>Colaboradores</FormLabel>
            <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-3">
              {availableUsers.length > 0 ? (
                availableUsers.map((u) => (
                  <div key={u.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`collab-${u.id}`}
                      checked={selectedCollaborators.includes(u.id)}
                      onCheckedChange={() => toggleCollaborator(u.id)}
                      data-testid={`checkbox-collaborator-${u.id}`}
                    />
                    <label
                      htmlFor={`collab-${u.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {u.username} ({u.email})
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No hay otros usuarios disponibles</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {selectedCollaborators.length} colaborador(es) seleccionado(s)
            </p>
          </FormItem>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-project">
              {mutation.isPending ? "Guardando..." : isEdit ? "Actualizar" : "Crear Proyecto"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

function ProjectCard({ project }: { project: ProjectWithCreator }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const isCreator = user?.id === project.creatorId;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/projects/${project.id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Proyecto eliminado",
        description: "El proyecto se eliminó correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo eliminar el proyecto",
      });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Card className="hover-elevate" data-testid={`card-project-${project.id}`}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="truncate mb-1" data-testid={`text-project-name-${project.id}`}>
                {project.name}
              </CardTitle>
              <CardDescription className="line-clamp-2">
                {project.description || "Sin descripción"}
              </CardDescription>
            </div>
            {isCreator && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`button-project-menu-${project.id}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)} data-testid={`button-edit-project-${project.id}`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => deleteMutation.mutate()}
                    className="text-destructive"
                    data-testid={`button-delete-project-${project.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Users className="h-4 w-4" />
            <span>Creador: {project.creator.username}</span>
          </div>

          {project.collaborators && project.collaborators.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Colaboradores:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {project.collaborators.map((collab) => (
                  <Badge key={collab.id} variant="secondary" className="text-xs" data-testid={`badge-collaborator-${collab.id}`}>
                    {collab.username}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Badge variant="secondary" data-testid={`badge-task-count-${project.id}`}>
            {project.taskCount || 0} tareas
          </Badge>
        </CardFooter>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <ProjectFormDialog project={project} onClose={() => setEditOpen(false)} />
      </Dialog>
    </>
  );
}

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: projects, isLoading } = useQuery<ProjectWithCreator[]>({
    queryKey: ["/api/projects"],
  });

  const filteredProjects = projects?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Mis Proyectos</h1>
          <p className="text-muted-foreground">
            Gestiona tus proyectos y colabora con tu equipo
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-project">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proyecto
            </Button>
          </DialogTrigger>
          <ProjectFormDialog onClose={() => setCreateOpen(false)} />
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proyectos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-search-projects"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects && filteredProjects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {search ? "No se encontraron proyectos" : "No tienes proyectos"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {search
                ? "Intenta con otro término de búsqueda"
                : "Crea tu primer proyecto para comenzar a organizar tus tareas"}
            </p>
            {!search && (
              <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-project">
                <Plus className="h-4 w-4 mr-2" />
                Crear Proyecto
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
