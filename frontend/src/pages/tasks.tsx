import { useState } from "react";
import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Edit, MoreVertical, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TaskWithDetails, ProjectWithCreator, User } from "@shared/schema";
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  closestCorners, 
  PointerSensor, 
  useSensor, 
  useSensors,
  useDroppable,
  useDraggable
} from "@dnd-kit/core";

// Define statuses and priorities as variables for flexibility
const STATUSES = [
  { value: "pending", label: "Pendiente", color: "bg-muted text-muted-foreground" },
  { value: "in_progress", label: "En Progreso", color: "bg-chart-1 text-white" },
  { value: "done", label: "Completada", color: "bg-chart-2 text-white" },
] as const;

const PRIORITIES = [
  { value: "high", label: "Alta", color: "bg-destructive text-destructive-foreground" },
  { value: "medium", label: "Media", color: "bg-chart-4 text-white" },
  { value: "low", label: "Baja", color: "bg-muted text-muted-foreground" },
] as const;

// Priority order for sorting (high = 0, medium = 1, low = 2)
const PRIORITY_ORDER: Record<PriorityValue, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

type StatusValue = typeof STATUSES[number]["value"];
type PriorityValue = typeof PRIORITIES[number]["value"];

const taskSchema = z.object({
  title: z.string().min(1, "El título es requerido").max(200),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  projectId: z.string().min(1, "El proyecto es requerido"),
  assignedToId: z.string().optional().nullable(),
});

type TaskForm = z.infer<typeof taskSchema>;

function TaskFormDialog({ task, onClose }: { task?: TaskWithDetails; onClose: () => void }) {
  const { toast } = useToast();
  const isEdit = !!task;

  const { data: projects } = useQuery<ProjectWithCreator[]>({
    queryKey: ["/api/projects"],
  });

  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      status: task?.status || "pending",
      priority: task?.priority || "medium",
      projectId: task?.projectId || "",
      assignedToId: task?.assignedToId || null,
    },
  });

  const selectedProjectId = form.watch("projectId");

  const { data: projectCollaborators } = useQuery<User[]>({
    queryKey: ["/api/projects", selectedProjectId, "collaborators"],
    enabled: !!selectedProjectId,
  });

  // Clear assignedToId when project changes
  React.useEffect(() => {
    if (isEdit && selectedProjectId && selectedProjectId !== task?.projectId) {
      form.setValue("assignedToId", null, { shouldDirty: true });
    }
  }, [selectedProjectId, isEdit, task?.projectId, form]);

  const mutation = useMutation({
    mutationFn: async (data: TaskForm) => {
      if (isEdit) {
        // For edit, send all form fields including priority
        return apiRequest("PATCH", `/api/tasks/${task.id}`, data);
      }
      return apiRequest("POST", "/api/tasks", data);
    },
    onMutate: async (data) => {
      if (!isEdit) return; // Only optimistic update for edits
      
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/tasks"] });
      
      // Snapshot previous value for rollback
      const previousTasks = queryClient.getQueryData<TaskWithDetails[]>(["/api/tasks"]);
      
      // Optimistically update cache with edited task
      queryClient.setQueryData<TaskWithDetails[]>(["/api/tasks"], (old) => {
        if (!old) return old;
        return old.map(t => 
          t.id === task.id 
            ? { ...t, ...data } // Merge edited fields
            : t
        );
      });
      
      // Return context for rollback
      return { previousTasks };
    },
    onError: (error: any, _, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/tasks"], context.previousTasks);
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo guardar la tarea",
      });
    },
    onSettled: () => {
      // Refetch to sync with server truth
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Tarea actualizada" : "Tarea creada",
        description: isEdit ? "La tarea se actualizó correctamente" : "La tarea se creó correctamente",
      });
      onClose();
    },
  });

  return (
    <DialogContent className="max-w-2xl" data-testid="dialog-task-form">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar Tarea" : "Crear Tarea"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "Modifica los detalles de la tarea" : "Completa los detalles para crear una nueva tarea"}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título de la tarea</FormLabel>
                <FormControl>
                  <Input placeholder="Implementar nueva funcionalidad" data-testid="input-task-title" {...field} />
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
                    placeholder="Describe los detalles de la tarea..."
                    rows={3}
                    data-testid="input-task-description"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proyecto</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-project">
                        <SelectValue placeholder="Selecciona un proyecto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects?.map((project, index) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedToId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asignar a</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "null" ? null : value)}
                    value={field.value || undefined}
                    disabled={!selectedProjectId}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-assigned-to">
                        <SelectValue placeholder={!selectedProjectId ? "Selecciona un proyecto primero" : "Sin asignar"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="null">Sin asignar</SelectItem>
                      {projectCollaborators?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEdit}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="in_progress">En Progreso</SelectItem>
                      <SelectItem value="done">Completada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridad</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-task">
              {mutation.isPending ? "Guardando..." : isEdit ? "Actualizar" : "Crear Tarea"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

function TaskCard({ task, isDragging, isMobile }: { task: TaskWithDetails; isDragging?: boolean; isMobile?: boolean }) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);

  const priorityInfo = PRIORITIES.find(p => p.value === task.priority);
  const statusInfo = STATUSES.find(s => s.value === task.status);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/tasks/${task.id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Tarea eliminada",
        description: "La tarea se eliminó correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo eliminar la tarea",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { status?: StatusValue; priority?: PriorityValue }) => {
      // Always send both status and priority to satisfy backend schema
      const payload = {
        status: data.status ?? task.status,
        priority: data.priority ?? task.priority,
      };
      return apiRequest("PATCH", `/api/tasks/${task.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Tarea actualizada",
        description: "La tarea se actualizó correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar la tarea",
      });
    },
  });

  return (
    <>
      <Card className={isDragging ? "opacity-50" : ""} data-testid={`card-task-${task.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="font-medium text-sm line-clamp-2 flex-1" data-testid={`text-task-title-${task.title}`}>
              {task.title}
            </h3>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" data-testid={`button-task-menu-${task.id}`}>
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)} data-testid={`button-edit-task-${task.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => deleteMutation.mutate()}
                  className="text-destructive"
                  data-testid={`button-delete-task-${task.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Mobile: Status selector */}
          {isMobile && statusInfo && (
            <div className="mb-3">
              <Select
                value={task.status}
                onValueChange={(value) => updateMutation.mutate({ status: value as StatusValue })}
              >
                <SelectTrigger className="h-8 w-full" data-testid={`select-status-${task.id}`}>
                  <SelectValue>
                    <Badge className={`${statusInfo.color} text-xs`}>
                      {statusInfo.label}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {/* Clickable priority badge */}
            {priorityInfo && (
              <Select
                value={task.priority}
                onValueChange={(value) => updateMutation.mutate({ priority: value as PriorityValue })}
              >
                <SelectTrigger className="h-auto w-auto border-0 p-0 hover-elevate" data-testid={`select-priority-${task.title}`}>
                  <SelectValue>
                    <Badge className={`${priorityInfo.color} text-xs cursor-pointer`}>
                      {priorityInfo.label}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <Badge className={`${p.color} text-xs`}>
                          {p.label}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Badge variant="secondary" className="text-xs" data-testid={`badge-task-project-${task.id}`}>
              {task.project.name}
            </Badge>

            {task.assignedTo && (
              <Badge variant="outline" className="text-xs">
                {task.assignedTo.username}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <TaskFormDialog task={task} onClose={() => setEditOpen(false)} />
      </Dialog>
    </>
  );
}

export default function TasksPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: tasks, isLoading } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: projects } = useQuery<ProjectWithCreator[]>({
    queryKey: ["/api/projects"],
  });

  const { data: allCollaborators } = useQuery<User[]>({
    queryKey: ["/api/collaborators"],
  });

  // Filter tasks
  const filteredTasks = tasks?.filter((task) => {
    if (filterProject !== "all" && task.projectId !== filterProject) return false;
    if (filterAssignedTo !== "all" && task.assignedToId !== filterAssignedTo) return false;
    if (filterPriority !== "all" && task.priority !== filterPriority) return false;
    if (filterStatus !== "all" && task.status !== filterStatus) return false;
    return true;
  });

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, priority }: { taskId: string; status: StatusValue; priority: PriorityValue }) => {
      const result = await apiRequest("PATCH", `/api/tasks/${taskId}`, { status, priority });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: any) => {
      console.error("[DRAG] PATCH error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar la tarea",
      });
    },
  });

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const newStatus = over.id as string;

    // Validate status is valid enum value
    const validStatuses = STATUSES.map(s => s.value);
    
    if (!validStatuses.includes(newStatus as StatusValue)) {
      console.error("Invalid status:", newStatus);
      return;
    }

    const taskId = active.id as string;
    
    // Get freshest task data from query cache to avoid stale priority after edits
    const cachedTasks = queryClient.getQueryData<TaskWithDetails[]>(["/api/tasks"]);
    const task = cachedTasks?.find(t => t.id === taskId);

    if (!task || !task.priority) {
      console.error("Task data missing or incomplete");
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo mover la tarea. Intenta recargar la página.",
      });
      return;
    }

    // Only update if status changed
    if (task.status !== newStatus) {
      // Send both status and current priority (priority doesn't change via drag)
      const payload = { 
        taskId: task.id, 
        status: newStatus as StatusValue,
        priority: task.priority 
      };
      updateTaskMutation.mutate(payload);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Get active task for drag overlay
  const activeTask = activeId ? tasks?.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Todas las Tareas</h1>
            <p className="text-muted-foreground">
              Arrastra las tareas para cambiar su estado
            </p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-task">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Tarea
              </Button>
            </DialogTrigger>
            <TaskFormDialog onClose={() => setCreateOpen(false)} />
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {/* Status filter - Always visible */}
              <div>
                <label className="text-sm font-medium mb-2 block">Estado</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger data-testid="filter-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Proyecto</label>
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger data-testid="filter-project">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Usuario Asignado</label>
                <Select value={filterAssignedTo} onValueChange={setFilterAssignedTo}>
                  <SelectTrigger data-testid="filter-assigned-to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {allCollaborators?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Prioridad</label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger data-testid="filter-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-20 mb-4" />
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Kanban Board - 3 columns only (states) - Desktop */}
            <div className="hidden md:grid md:grid-cols-3 gap-4">
              {STATUSES.map((status) => {
                // Get tasks for this status, sorted by priority
                const statusTasks = filteredTasks?.filter(
                  (t) => t.status === status.value
                ).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) || [];

                return (
                  <KanbanColumn
                    key={status.value}
                    id={status.value}
                    status={status}
                    tasks={statusTasks}
                  />
                );
              })}
            </div>

            {/* Mobile List View */}
            <div className="md:hidden space-y-3">
              {filteredTasks?.map((task) => (
                <TaskCard key={task.id} task={task} isMobile />
              ))}
            </div>

            {filteredTasks?.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {tasks?.length === 0 ? "No tienes tareas" : "No se encontraron tareas"}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    {tasks?.length === 0
                      ? "Crea tu primera tarea para comenzar a organizar tu trabajo"
                      : "Intenta con otros filtros"}
                  </p>
                  {tasks?.length === 0 && (
                    <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-task">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Tarea
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// Kanban Column Component with Droppable functionality
function KanbanColumn({
  id,
  status,
  tasks,
}: {
  id: string;
  status: typeof STATUSES[number];
  tasks: TaskWithDetails[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-background pb-2">
        <Badge className={`${status.color} text-sm`}>
          {status.label} ({tasks.length})
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[600px] p-3 rounded-md border-2 transition-colors ${
          isOver ? "border-primary bg-accent/50" : "border-dashed border-border"
        }`}
        data-testid={`dropzone-${id}`}
      >
        <div className="space-y-2">
          {tasks.map((task) => (
            <DraggableTask key={task.id} task={task} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Draggable Task Component with drag handle
function DraggableTask({ task }: { task: TaskWithDetails }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: {
      task, // Pass task data through DnD context
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute left-1 top-1 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 hover-elevate rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className={isDragging ? "opacity-50" : ""}>
        <TaskCard task={task} isDragging={isDragging} />
      </div>
    </div>
  );
}
