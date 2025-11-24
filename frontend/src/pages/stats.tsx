import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, FolderKanban, CheckSquare, Clock, PlayCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { UserStats } from "@shared/schema";

export default function StatsPage() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<UserStats>({
    queryKey: ["/api/stats", user?.id],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Estadísticas</h1>
          <p className="text-muted-foreground">
            Análisis detallado de tus proyectos y tareas
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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

  const totalTasks = stats?.totalTasks || 0;
  const completionRate = totalTasks > 0
    ? Math.round(((stats?.tasksByStatus.done || 0) / totalTasks) * 100)
    : 0;

  const statsCards = [
    {
      title: "Total de Proyectos",
      description: "Proyectos que has creado",
      value: stats?.totalProjects || 0,
      icon: FolderKanban,
      iconColor: "text-chart-1",
      bgColor: "bg-chart-1/10",
      testId: "stat-total-projects",
    },
    {
      title: "Total de Tareas",
      description: "Tareas en todos tus proyectos",
      value: stats?.totalTasks || 0,
      icon: CheckSquare,
      iconColor: "text-chart-2",
      bgColor: "bg-chart-2/10",
      testId: "stat-total-tasks",
    },
    {
      title: "Tasa de Completitud",
      description: "Porcentaje de tareas completadas",
      value: `${completionRate}%`,
      icon: TrendingUp,
      iconColor: "text-chart-2",
      bgColor: "bg-chart-2/10",
      testId: "stat-completion-rate",
    },
    {
      title: "Tareas Pendientes",
      description: "Aún no iniciadas",
      value: stats?.tasksByStatus.pending || 0,
      icon: Clock,
      iconColor: "text-muted-foreground",
      bgColor: "bg-muted/30",
      testId: "stat-pending",
    },
    {
      title: "En Progreso",
      description: "Tareas en desarrollo",
      value: stats?.tasksByStatus.in_progress || 0,
      icon: PlayCircle,
      iconColor: "text-chart-1",
      bgColor: "bg-chart-1/10",
      testId: "stat-in-progress",
    },
    {
      title: "Completadas",
      description: "Tareas finalizadas",
      value: stats?.tasksByStatus.done || 0,
      icon: CheckCircle2,
      iconColor: "text-chart-2",
      bgColor: "bg-chart-2/10",
      testId: "stat-done",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Estadísticas</h1>
        <p className="text-muted-foreground">
          Análisis detallado de tus proyectos y tareas
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="hover-elevate">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    {stat.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {stat.description}
                  </CardDescription>
                </div>
                <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-semibold" data-testid={stat.testId}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats && totalTasks > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resumen de Tareas
            </CardTitle>
            <CardDescription>
              Distribución de tus tareas por estado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Pendientes</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.tasksByStatus.pending} de {totalTasks}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-muted-foreground"
                    style={{
                      width: `${(stats.tasksByStatus.pending / totalTasks) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">En Progreso</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.tasksByStatus.in_progress} de {totalTasks}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-chart-1"
                    style={{
                      width: `${(stats.tasksByStatus.in_progress / totalTasks) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Completadas</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.tasksByStatus.done} de {totalTasks}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-chart-2"
                    style={{
                      width: `${(stats.tasksByStatus.done / totalTasks) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
