import {
  users,
  projects,
  tasks,
  projectCollaborators,
  type User,
  type ProjectUser,
  type InsertUser,
  type Project,
  type InsertProject,
  type UpdateProject,
  type Task,
  type InsertTask,
  type UpdateTask,
  type ProjectCollaborator,
  type ProjectWithCreator,
  type TaskWithDetails,
  type UserStats,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, sql, inArray } from "drizzle-orm";

// Repository Interface - abstracción para cualquier base de datos
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<ProjectUser[]>;

  // Projects
  getProject(id: string): Promise<ProjectWithCreator | undefined>;
  getProjectsByUser(userId: string): Promise<ProjectWithCreator[]>;
  createProject(project: InsertProject, creatorId: string): Promise<Project>;
  updateProject(id: string, project: UpdateProject): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  // Project Collaborators
  getCollaborator(id: string): Promise<ProjectCollaborator | undefined>;
  addCollaborator(projectId: string, userId: string): Promise<ProjectCollaborator>;
  removeCollaborator(projectId: string, userId: string): Promise<void>;
  getProjectCollaborators(projectId: string): Promise<ProjectUser[]>;
  isUserCollaborator(projectId: string, userId: string): Promise<boolean>;

  // Tasks
  getTaskHeader(id: string): Promise<Task | undefined>;
  getTask(id: string): Promise<TaskWithDetails | undefined>;
  getTasks(filters?: {
    status?: string;
    priority?: string;
    projectId?: string;
    assignedToId?: string;
  }): Promise<TaskWithDetails[]>;
  getTasksForUser(userId: string, filters?: {
    status?: string;
    priority?: string;
    projectId?: string;
    assignedToId?: string;
  }): Promise<TaskWithDetails[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: UpdateTask): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  hasProjectAccess(projectId: string, userId: string): Promise<boolean>;

  // Stats
  getUserStats(userId: string): Promise<UserStats>;

  // Collaborators
  getAllCollaboratorsForUser(userId: string): Promise<ProjectUser[]>;
}

// Implementación MySQL del repositorio
export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [result] = await db
      .insert(users)
      .values(insertUser)
      .$returningId();

    return (await this.getUser(result.id))!;
  }

  async getAllUsers(): Promise<ProjectUser[]> {
    return db.select({
      id: users.id,
      username: users.username,
      email: users.email,
    }).from(users);
  }

  // Projects
  async getProject(id: string): Promise<ProjectWithCreator | undefined> {
    const [project] = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        creatorId: projects.creatorId,
        createdAt: projects.createdAt,
        creator: {
          id: users.id,
          username: users.username,
          email: users.email,
        },
      })
      .from(projects)
      .innerJoin(users, eq(projects.creatorId, users.id))
      .where(eq(projects.id, id));

    if (!project) return undefined;

    // Get collaborators
    const collaborators = await this.getProjectCollaborators(id);

    // Get task count
    const [taskCountResult] = await db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(tasks)
      .where(eq(tasks.projectId, id));

    return {
      ...project,
      collaborators: collaborators.map(c => ({
        id: c.id,
        username: c.username,
        email: c.email,
      })),
      taskCount: taskCountResult.count,
    };
  }

  async getProjectsByUser(userId: string): Promise<ProjectWithCreator[]> {
    // Get projects where user is creator or collaborator
    const createdProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        creatorId: projects.creatorId,
        createdAt: projects.createdAt,
        creator: {
          id: users.id,
          username: users.username,
          email: users.email,
        },
      })
      .from(projects)
      .innerJoin(users, eq(projects.creatorId, users.id))
      .where(eq(projects.creatorId, userId));

    const collaboratedProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        creatorId: projects.creatorId,
        createdAt: projects.createdAt,
        creator: {
          id: users.id,
          username: users.username,
          email: users.email,
        },
      })
      .from(projects)
      .innerJoin(users, eq(projects.creatorId, users.id))
      .innerJoin(projectCollaborators, eq(projects.id, projectCollaborators.projectId))
      .where(eq(projectCollaborators.userId, userId));

    // ✅ NEW: Get projects where user has at least one assigned task
    const assignedProjects = await db
      .selectDistinct({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        creatorId: projects.creatorId,
        createdAt: projects.createdAt,
        creator: {
          id: users.id,
          username: users.username,
          email: users.email,
        },
      })
      .from(projects)
      .innerJoin(users, eq(projects.creatorId, users.id))
      .innerJoin(tasks, eq(projects.id, tasks.projectId))
      .where(eq(tasks.assignedToId, userId));

    // Combine and deduplicate
    const allProjects = [...createdProjects, ...collaboratedProjects, ...assignedProjects];
    const uniqueProjects = Array.from(
      new Map(allProjects.map(p => [p.id, p])).values()
    );

    // Add collaborators and task count to each project
    const projectsWithDetails = await Promise.all(
      uniqueProjects.map(async (project) => {
        const collaborators = await this.getProjectCollaborators(project.id);
        const [taskCountResult] = await db
          .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
          .from(tasks)
          .where(eq(tasks.projectId, project.id));

        return {
          ...project,
          collaborators: collaborators.map(c => ({
            id: c.id,
            username: c.username,
            email: c.email,
          })),
          taskCount: taskCountResult.count,
        };
      })
    );

    return projectsWithDetails;
  }

  async createProject(insertProject: InsertProject, creatorId: string): Promise<Project> {
    const [result] = await db
      .insert(projects)
      .values({ ...insertProject, creatorId })
      .$returningId();

    return (await this.getProject(result.id))!;
  }

  async updateProject(id: string, updateProject: UpdateProject): Promise<Project | undefined> {
    await db
      .update(projects)
      .set(updateProject)
      .where(eq(projects.id, id));

    return await this.getProject(id);
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Project Collaborators
  async getCollaborator(id: string): Promise<ProjectCollaborator | undefined> {
    const [collaborator] = await db.select().from(projectCollaborators).where(eq(projectCollaborators.id, id));
    return collaborator || undefined;
  }

  async addCollaborator(projectId: string, userId: string): Promise<ProjectCollaborator> {
    const [result] = await db
      .insert(projectCollaborators)
      .values({ projectId, userId })
      .$returningId();

    return (await this.getCollaborator(result.id))!;
  }

  async removeCollaborator(projectId: string, userId: string): Promise<void> {
    await db
      .delete(projectCollaborators)
      .where(
        and(
          eq(projectCollaborators.projectId, projectId),
          eq(projectCollaborators.userId, userId)
        )
      );
  }

  async getProjectCollaborators(projectId: string): Promise<ProjectUser[]> {
    const collaborators = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
      })
      .from(projectCollaborators)
      .innerJoin(users, eq(projectCollaborators.userId, users.id))
      .where(eq(projectCollaborators.projectId, projectId));

    return collaborators;
  }

  async isUserCollaborator(projectId: string, userId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(projectCollaborators)
      .where(
        and(
          eq(projectCollaborators.projectId, projectId),
          eq(projectCollaborators.userId, userId)
        )
      );
    return !!result;
  }

  async getAllCollaboratorsForUser(userId: string): Promise<ProjectUser[]> {
    // Get all projects user has access to (created or collaborated)
    const userProjects = await db
      .select({ 
        id: projects.id,
        creatorId: projects.creatorId,
      })
      .from(projects)
      .where(
        or(
          eq(projects.creatorId, userId),
          sql`${projects.id} IN (SELECT ${projectCollaborators.projectId} FROM ${projectCollaborators} WHERE ${projectCollaborators.userId} = ${userId})`
        )
      );

    const projectIds = userProjects.map(p => p.id);
    const creatorIds = Array.from(new Set(userProjects.map(p => p.creatorId)));

    if (projectIds.length === 0) {
      return [];
    }

    // Get all unique collaborators from these projects
    const collaborators = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
      })
      .from(projectCollaborators)
      .innerJoin(users, eq(projectCollaborators.userId, users.id))
      .where(
        sql`${projectCollaborators.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`
      );

    // Get all creators of these projects
    const creators = creatorIds.length > 0 
      ? await db
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
          })
          .from(users)
          .where(
            sql`${users.id} IN (${sql.join(creatorIds.map(id => sql`${id}`), sql`, `)})`
          )
      : [];

    // Combine and deduplicate by user ID
    const allUsers = [...collaborators, ...creators];
    const uniqueUsers = Array.from(
      new Map(allUsers.map(u => [u.id, u])).values()
    );

    return uniqueUsers;
  }

  // Tasks
  async getTaskHeader(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTask(id: string): Promise<TaskWithDetails | undefined> {
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        projectId: tasks.projectId,
        assignedToId: tasks.assignedToId,
        createdAt: tasks.createdAt,
        project: {
          id: projects.id,
          name: projects.name,
        },
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.id, id));

    if (!task) return undefined;

    // Get assigned user if exists
    if (task.assignedToId) {
      const [assignedUser] = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, task.assignedToId));

      return {
        ...task,
        assignedTo: assignedUser || null,
      };
    }

    return {
      ...task,
      assignedTo: null,
    };
  }

  async getTasks(filters?: {
    status?: string;
    priority?: string;
    projectId?: string;
    assignedToId?: string;
  }): Promise<TaskWithDetails[]> {
    let query = db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        projectId: tasks.projectId,
        assignedToId: tasks.assignedToId,
        createdAt: tasks.createdAt,
        project: {
          id: projects.id,
          name: projects.name,
        },
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id));

    const conditions = [];
    if (filters?.status) conditions.push(eq(tasks.status, filters.status as any));
    if (filters?.priority) conditions.push(eq(tasks.priority, filters.priority as any));
    if (filters?.projectId) conditions.push(eq(tasks.projectId, filters.projectId));
    if (filters?.assignedToId) conditions.push(eq(tasks.assignedToId, filters.assignedToId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const tasksList = await query;

    // Get assigned users for all tasks
    const tasksWithAssignedUsers = await Promise.all(
      tasksList.map(async (task) => {
        if (task.assignedToId) {
          const [assignedUser] = await db
            .select({
              id: users.id,
              username: users.username,
              email: users.email,
            })
            .from(users)
            .where(eq(users.id, task.assignedToId));

          return {
            ...task,
            assignedTo: assignedUser || null,
          };
        }

        return {
          ...task,
          assignedTo: null,
        };
      })
    );

    return tasksWithAssignedUsers;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [result] = await db
      .insert(tasks)
      .values(insertTask)
      .$returningId();

    return (await this.getTaskHeader(result.id))!;
  }

  async updateTask(id: string, updateTask: UpdateTask): Promise<Task | undefined> {
    await db
      .update(tasks)
      .set(updateTask)
      .where(eq(tasks.id, id));

    return await this.getTaskHeader(id);
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const project = await this.getProject(projectId);
    if (!project) {
      return false;
    }

    // User has access if they are the creator or a collaborator
    const isCreator = project.creatorId === userId;
    if (isCreator) {
      return true;
    }

    const isCollaborator = await this.isUserCollaborator(projectId, userId);
    return isCollaborator;
  }

  /**
   * ✅ Check if user is creator OR collaborator (full management permissions)
   * Used to determine if user can modify/delete tasks
   */
  async isCreatorOrCollaborator(projectId: string, userId: string): Promise<boolean> {
    const project = await this.getProject(projectId);
    if (!project) {
      return false;
    }

    // Creator has full permissions
    if (project.creatorId === userId) {
      return true;
    }

    // Check if user is a collaborator
    return await this.isUserCollaborator(projectId, userId);
  }

  async getTasksForUser(
    userId: string,
    filters?: {
      status?: string;
      priority?: string;
      projectId?: string;
      assignedToId?: string;
    }
  ): Promise<TaskWithDetails[]> {
    // 1. Get all projects where user is creator OR collaborator OR has assigned tasks
    const creatorOrCollaboratorProjects = await db
      .selectDistinct({ projectId: projects.id })
      .from(projects)
      .leftJoin(
        projectCollaborators,
        eq(projects.id, projectCollaborators.projectId)
      )
      .where(
        or(
          eq(projects.creatorId, userId),
          eq(projectCollaborators.userId, userId)
        )
      );

    // ✅ NEW: Get projects where user has at least one assigned task
    const assignedTaskProjects = await db
      .selectDistinct({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.assignedToId, userId));

    // Combine and deduplicate project IDs
    const allProjectIds = [
      ...creatorOrCollaboratorProjects.map(p => p.projectId),
      ...assignedTaskProjects.map(p => p.projectId),
    ];
    const accessibleProjectIds = [...new Set(allProjectIds)];

    // If user has no accessible projects, return empty array
    if (accessibleProjectIds.length === 0) {
      return [];
    }

    // 2. Build query for tasks in accessible projects with additional filters
    const conditions = [inArray(tasks.projectId, accessibleProjectIds)];
    
    // 3. Apply additional filters
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status as any));
    }
    if (filters?.priority) {
      conditions.push(eq(tasks.priority, filters.priority as any));
    }
    if (filters?.projectId) {
      // Validate user has access to this specific project
      if (!accessibleProjectIds.includes(filters.projectId)) {
        return []; // User doesn't have access to this project
      }
      conditions.push(eq(tasks.projectId, filters.projectId));
    }
    if (filters?.assignedToId) {
      conditions.push(eq(tasks.assignedToId, filters.assignedToId));
    }

    const query = db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        projectId: tasks.projectId,
        assignedToId: tasks.assignedToId,
        createdAt: tasks.createdAt,
        project: {
          id: projects.id,
          name: projects.name,
        },
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(...conditions));

    const tasksList = await query;

    // 4. Get assigned users for all tasks (same as getTasks)
    const tasksWithAssignedUsers = await Promise.all(
      tasksList.map(async (task) => {
        if (task.assignedToId) {
          const [assignedUser] = await db
            .select({
              id: users.id,
              username: users.username,
              email: users.email,
            })
            .from(users)
            .where(eq(users.id, task.assignedToId));

          return {
            ...task,
            assignedTo: assignedUser || null,
          };
        }

        return {
          ...task,
          assignedTo: null,
        };
      })
    );

    return tasksWithAssignedUsers;
  }

  // Stats
  async getUserStats(userId: string): Promise<UserStats> {
    // Get total projects (created or collaborated)
    const [createdProjectsCount] = await db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(projects)
      .where(eq(projects.creatorId, userId));

    const [collaboratedProjectsCount] = await db
      .select({ count: sql<number>`CAST(COUNT(distinct ${projectCollaborators.projectId}) AS SIGNED)` })
      .from(projectCollaborators)
      .where(eq(projectCollaborators.userId, userId));

    const totalProjects = createdProjectsCount.count + collaboratedProjectsCount.count;

    // Get all projects user has access to
    const userProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        or(
          eq(projects.creatorId, userId),
          sql`${projects.id} IN (SELECT ${projectCollaborators.projectId} FROM ${projectCollaborators} WHERE ${projectCollaborators.userId} = ${userId})`
        )
      );

    const projectIds = userProjects.map(p => p.id);

    // Get total tasks in user's projects
    let totalTasks = 0;
    let pendingTasks = 0;
    let inProgressTasks = 0;
    let doneTasks = 0;

    if (projectIds.length > 0) {
      const [totalCount] = await db
        .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
        .from(tasks)
        .where(sql`${tasks.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`);

      const [pendingCount] = await db
        .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
        .from(tasks)
        .where(
          and(
            sql`${tasks.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`,
            eq(tasks.status, "pending")
          )
        );

      const [inProgressCount] = await db
        .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
        .from(tasks)
        .where(
          and(
            sql`${tasks.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`,
            eq(tasks.status, "in_progress")
          )
        );

      const [doneCount] = await db
        .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
        .from(tasks)
        .where(
          and(
            sql`${tasks.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`,
            eq(tasks.status, "done")
          )
        );

      totalTasks = totalCount.count;
      pendingTasks = pendingCount.count;
      inProgressTasks = inProgressCount.count;
      doneTasks = doneCount.count;
    }

    return {
      totalProjects,
      totalTasks,
      tasksByStatus: {
        pending: pendingTasks,
        in_progress: inProgressTasks,
        done: doneTasks,
      },
    };
  }
}

export const storage = new DatabaseStorage();
