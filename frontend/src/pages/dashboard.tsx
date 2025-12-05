import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban, CheckSquare, Clock, PlayCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { UserStats } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<UserStats>({
    queryKey: ["/api/stats", user?.id],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido de vuelta, {user?.username}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Proyectos",
      value: stats?.totalProjects || 0,
      icon: FolderKanban,
      iconColor: "text-chart-1",
      testId: "stat-total-projects",
    },
    {
      title: "Total Tareas",
      value: stats?.totalTasks || 0,
      icon: CheckSquare,
      iconColor: "text-chart-2",
      testId: "stat-total-tasks",
    },
    {
      title: "Pendientes",
      value: stats?.tasksByStatus.pending || 0,
      icon: Clock,
      iconColor: "text-muted-foreground",
      testId: "stat-pending-tasks",
    },
    {
      title: "En Progreso",
      value: stats?.tasksByStatus.in_progress || 0,
      icon: PlayCircle,
      iconColor: "text-chart-1",
      testId: "stat-in-progress-tasks",
    },
    {
      title: "Completadas",
      value: stats?.tasksByStatus.done || 0,
      icon: CheckCircle2,
      iconColor: "text-chart-2",
      testId: "stat-done-tasks",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Bienvenido de vuelta, <span className="font-medium">{user?.username}</span>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-semibold" data-testid={stat.testId}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats && stats.totalProjects === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tienes proyectos aún</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Comienza creando tu primer proyecto para organizar tus tareas y colaborar con tu equipo.
            </p>
            <a href="/projects">
              <button className="text-primary hover:underline font-medium">
                Ir a Proyectos →
              </button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
