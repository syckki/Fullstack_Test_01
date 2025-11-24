import { relations } from "drizzle-orm";
import { mysqlTable as table, text, varchar, timestamp, mysqlEnum as defEnum, unique } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const taskStatusEnum = defEnum("task_status", ["pending", "in_progress", "done"]);
export const taskPriorityEnum = defEnum("task_priority", ["low", "medium", "high"]);

// Tables
export const users = table("users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = table("projects", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  creatorId: varchar("creator_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = table("tasks", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  status: taskStatusEnum.default("pending").notNull(),
  priority: taskPriorityEnum.default("medium").notNull(),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  assignedToId: varchar("assigned_to_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectCollaborators = table("project_collaborators", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (table) => ({
  uniqueProjectUser: unique("unique_project_user").on(table.projectId, table.userId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdProjects: many(projects),
  assignedTasks: many(tasks),
  collaborations: many(projectCollaborators),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  creator: one(users, {
    fields: [projects.creatorId],
    references: [users.id],
  }),
  tasks: many(tasks),
  collaborators: many(projectCollaborators),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
  }),
}));

export const projectCollaboratorsRelations = relations(projectCollaborators, ({ one }) => ({
  project: one(projects, {
    fields: [projectCollaborators.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectCollaborators.userId],
    references: [users.id],
  }),
}));

// Insert Schemas (for validation)
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
}).omit({ id: true, createdAt: true });

export const insertProjectSchema = createInsertSchema(projects, {
  name: z.string().min(1, "Project name is required").max(200),
  description: z.string().optional(),
}).omit({ id: true, createdAt: true, creatorId: true });

export const insertTaskSchema = createInsertSchema(tasks, {
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assignedToId: z.string().optional().nullable(),
}).omit({ id: true, createdAt: true });

export const insertProjectCollaboratorSchema = createInsertSchema(projectCollaborators, {
  userId: z.string().min(1, "User ID is required"),
}).omit({ id: true, addedAt: true, projectId: true });

// Login Schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// Update Schemas
export const updateProjectSchema = insertProjectSchema.partial();
export const updateTaskSchema = insertTaskSchema.partial();

// TypeScript Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type ProjectUser = Pick<User, "id" | "username" | "email">

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

export type ProjectCollaborator = typeof projectCollaborators.$inferSelect;
export type InsertProjectCollaborator = z.infer<typeof insertProjectCollaboratorSchema>;

// Extended types for API responses
export type ProjectWithCreator = Project & {
  creator: Pick<User, "id" | "username" | "email">;
  collaborators?: Array<Pick<User, "id" | "username" | "email">>;
  taskCount?: number;
};

export type TaskWithDetails = Task & {
  project: Pick<Project, "id" | "name">;
  assignedTo?: Pick<User, "id" | "username" | "email"> | null;
};

export type UserStats = {
  totalProjects: number;
  totalTasks: number;
  tasksByStatus: {
    pending: number;
    in_progress: number;
    done: number;
  };
};
