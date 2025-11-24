import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, generateToken, type AuthRequest } from "./middleware/auth";
import { body, param, query, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "TaskFlow API",
      version: "1.0.0",
      description: "API para gestión de proyectos y tareas colaborativas",
    },
    servers: [
      {
        url: "/api",
        description: "API Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./backend/routes.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export async function registerRoutes(app: Express): Promise<Server> {
  // Swagger documentation
  app.use("/api-docs", swaggerUi.serve as any, swaggerUi.setup(swaggerSpec) as any);
  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

  // Validation middleware
  const handleValidationErrors = (req: any, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };

  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Registrar nuevo usuario
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - email
   *               - password
   *             properties:
   *               username:
   *                 type: string
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       201:
   *         description: Usuario creado exitosamente
   */
  app.post(
    "/api/auth/register",
    [
      body("username").trim().isLength({ min: 3, max: 50 }),
      body("email").isEmail().normalizeEmail(),
      body("password").isLength({ min: 6 }),
    ],
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUserByEmail = await storage.getUserByEmail(email);
        if (existingUserByEmail) {
          return res.status(400).json({ error: "Email already registered" });
        }

        const existingUserByUsername = await storage.getUserByUsername(username);
        if (existingUserByUsername) {
          return res.status(400).json({ error: "Username already taken" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await storage.createUser({
          username,
          email,
          password: hashedPassword,
        });

        // Generate token
        const token = generateToken(user.id);

        res.status(201).json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Iniciar sesión
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login exitoso
   */
  app.post(
    "/api/auth/login",
    [
      body("email").isEmail().normalizeEmail(),
      body("password").notEmpty(),
    ],
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;

        // Find user
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate token
        const token = generateToken(user.id);

        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /auth/me:
   *   get:
   *     summary: Obtener usuario actual
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Usuario actual
   */
  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /projects:
   *   get:
   *     summary: Listar proyectos del usuario
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de proyectos
   */
  app.get("/api/projects", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const projects = await storage.getProjectsByUser(req.userId!);
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /projects:
   *   post:
   *     summary: Crear proyecto
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *     responses:
   *       201:
   *         description: Proyecto creado
   */
  app.post(
    "/api/projects",
    authenticateToken,
    [
      body("name").trim().isLength({ min: 1, max: 200 }),
      body("description").optional().trim(),
    ],
    handleValidationErrors,
    async (req: AuthRequest, res: Response) => {
      try {
        const { name, description } = req.body;
        const project = await storage.createProject({ name, description }, req.userId!);
        res.status(201).json(project);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /projects/{id}:
   *   get:
   *     summary: Obtener proyecto
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Proyecto
   */
  app.get(
    "/api/projects/:id",
    authenticateToken,
    [param("id").isUUID()],
    handleValidationErrors,
    async (req: AuthRequest, res: Response) => {
      try {
        const project = await storage.getProject(req.params.id);
        if (!project) {
          return res.status(404).json({ error: "Project not found" });
        }

        // Check if user has access
        const isCreator = project.creatorId === req.userId;
        const isCollaborator = await storage.isUserCollaborator(project.id, req.userId!);

        if (!isCreator && !isCollaborator) {
          return res.status(403).json({ error: "Access denied" });
        }

        res.json(project);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /projects/{id}:
   *   patch:
   *     summary: Actualizar proyecto (solo creador)
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Proyecto actualizado
   */
  app.patch(
    "/api/projects/:id",
    authenticateToken,
    [
      param("id").isUUID(),
      body("name").optional().trim().isLength({ min: 1, max: 200 }),
      body("description").optional().trim(),
    ],
    handleValidationErrors,
    async (req: AuthRequest, res: Response) => {
      try {
        const project = await storage.getProject(req.params.id);
        if (!project) {
          return res.status(404).json({ error: "Project not found" });
        }

        if (project.creatorId !== req.userId) {
          return res.status(403).json({ error: "Only creator can update project" });
        }

        const updated = await storage.updateProject(req.params.id, req.body);
        res.json(updated);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /projects/{id}:
   *   delete:
   *     summary: Eliminar proyecto (solo creador)
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Proyecto eliminado
   */
  app.delete(
    "/api/projects/:id",
    authenticateToken,
    [param("id").isUUID()],
    handleValidationErrors,
    async (req: AuthRequest, res: Response) => {
      try {
        const project = await storage.getProject(req.params.id);
        if (!project) {
          return res.status(404).json({ error: "Project not found" });
        }

        if (project.creatorId !== req.userId) {
          return res.status(403).json({ error: "Only creator can delete project" });
        }

        await storage.deleteProject(req.params.id);
        res.status(204).send();
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /projects/{id}/collaborators:
   *   post:
   *     summary: Añadir colaborador
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Colaborador añadido
   */
  app.post(
    "/api/projects/:id/collaborators",
    authenticateToken,
    [
      param("id").isUUID(),
      body("userId").isUUID(),
    ],
    handleValidationErrors,
    async (req: AuthRequest, res: Response) => {
      try {
        const project = await storage.getProject(req.params.id);
        if (!project) {
          return res.status(404).json({ error: "Project not found" });
        }

        if (project.creatorId !== req.userId) {
          return res.status(403).json({ error: "Only creator can add collaborators" });
        }

        const collaborator = await storage.addCollaborator(req.params.id, req.body.userId);
        res.status(201).json(collaborator);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /projects/{id}/collaborators/{userId}:
   *   delete:
   *     summary: Eliminar colaborador
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       204:
   *         description: Colaborador eliminado
   */
  app.delete(
    "/api/projects/:id/collaborators/:userId",
    authenticateToken,
    [
      param("id").isUUID(),
      param("userId").isUUID(),
    ],
    handleValidationErrors,
    async (req: AuthRequest, res: Response) => {
      try {
        const project = await storage.getProject(req.params.id);
        if (!project) {
          return res.status(404).json({ error: "Project not found" });
        }

        if (project.creatorId !== req.userId) {
          return res.status(403).json({ error: "Only creator can remove collaborators" });
        }

        await storage.removeCollaborator(req.params.id, req.params.userId);
        res.status(204).send();
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /tasks:
   *   get:
   *     summary: Listar tareas con filtros
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, in_progress, done]
   *       - in: query
   *         name: priority
   *         schema:
   *           type: string
   *           enum: [low, medium, high]
   *       - in: query
   *         name: projectId
   *         schema:
   *           type: string
   *       - in: query
   *         name: assignedToId
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Lista de tareas
   */
  app.get(
    "/api/tasks",
    authenticateToken,
    [
      query("status").optional().isIn(["pending", "in_progress", "done"]),
      query("priority").optional().isIn(["low", "medium", "high"]),
      query("projectId").optional().isUUID(),
      query("assignedToId").optional().isUUID(),
    ],
    handleValidationErrors,
    async (req: AuthRequest, res: Response) => {
      try {
        const filters = {
          status: req.query.status as string | undefined,
          priority: req.query.priority as string | undefined,
          projectId: req.query.projectId as string | undefined,
          assignedToId: req.query.assignedToId as string | undefined,
        };

        const tasks = await storage.getTasks(filters);
        res.json(tasks);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /tasks:
   *   post:
   *     summary: Crear tarea
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Tarea creada
   */
  app.post(
    "/api/tasks",
    authenticateToken,
    [
      body("title").trim().isLength({ min: 1, max: 200 }),
      body("description").optional().trim(),
      body("status").optional().isIn(["pending", "in_progress", "done"]),
      body("priority").optional().isIn(["low", "medium", "high"]),
      body("projectId").isUUID(),
      body("assignedToId").optional(),
    ],
    handleValidationErrors,
    async (req: AuthRequest, res: Response) => {
      try {
        const { title, description, status, priority, projectId, assignedToId } = req.body;

        // Check if user has access to project
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ error: "Project not found" });
        }

        const isCreator = project.creatorId === req.userId;
        const isCollaborator = await storage.isUserCollaborator(projectId, req.userId!);

        if (!isCreator && !isCollaborator) {
          return res.status(403).json({ error: "Access denied" });
        }

        // Validate assignedToId is a collaborator or creator
        const finalAssignedToId = assignedToId === "null" ? null : assignedToId;
        if (finalAssignedToId) {
          const isAssignedUserCreator = project.creatorId === finalAssignedToId;
          const isAssignedUserCollaborator = await storage.isUserCollaborator(projectId, finalAssignedToId);
          
          if (!isAssignedUserCreator && !isAssignedUserCollaborator) {
            return res.status(400).json({ error: "User must be a collaborator of the project" });
          }
        }

        const task = await storage.createTask({
          title,
          description,
          status: status || "pending",
          priority: priority || "medium",
          projectId,
          assignedToId: finalAssignedToId,
        });

        res.status(201).json(task);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /tasks/{id}:
   *   patch:
   *     summary: Actualizar tarea
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Tarea actualizada
   */
  app.patch(
    "/api/tasks/:id",
    authenticateToken,
    [
      param("id").isUUID(),
      body("title").optional().trim().isLength({ min: 1, max: 200 }),
      body("description").optional().trim(),
      body("status").optional().isIn(["pending", "in_progress", "done"]),
      body("priority").optional().isIn(["low", "medium", "high"]),
      body("assignedToId").optional(),
    ],
    handleValidationErrors,
    async (req: AuthRequest, res: Response) => {
      try {
        const task = await storage.getTask(req.params.id);
        if (!task) {
          return res.status(404).json({ error: "Task not found" });
        }

        const updateData = { ...req.body };
        
        // Convert "null" string or empty string to null
        if (updateData.assignedToId === "null" || updateData.assignedToId === "") {
          updateData.assignedToId = null;
        }

        // Determine which projectId to validate against
        const projectId = updateData.projectId || task.projectId;

        // If project is being changed, ensure assignedToId is explicitly handled
        if (updateData.projectId && updateData.projectId !== task.projectId) {
          // If assignedToId is not explicitly provided in the update, clear it
          if (updateData.assignedToId === undefined) {
            updateData.assignedToId = null;
          } else if (updateData.assignedToId) {
            // If a new assignedToId is provided, validate it's a collaborator of the new project
            const project = await storage.getProject(projectId);
            if (!project) {
              return res.status(404).json({ error: "Project not found" });
            }

            const isAssignedUserCreator = project.creatorId === updateData.assignedToId;
            const isAssignedUserCollaborator = await storage.isUserCollaborator(projectId, updateData.assignedToId);
            
            // If assigned user is not a collaborator of the new project, clear the assignment
            if (!isAssignedUserCreator && !isAssignedUserCollaborator) {
              updateData.assignedToId = null;
            }
          }
        }

        // If assigning to a user (not null/undefined), validate the assigned user is a collaborator or creator
        if (updateData.assignedToId && updateData.assignedToId !== "null") {
          const project = await storage.getProject(projectId);
          if (!project) {
            return res.status(404).json({ error: "Project not found" });
          }

          const isAssignedUserCreator = project.creatorId === updateData.assignedToId;
          const isAssignedUserCollaborator = await storage.isUserCollaborator(projectId, updateData.assignedToId);
          
          if (!isAssignedUserCreator && !isAssignedUserCollaborator) {
            return res.status(400).json({ error: "User must be a collaborator of the project" });
          }
        }

        const updated = await storage.updateTask(req.params.id, updateData);
        res.json(updated);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /tasks/{id}:
   *   delete:
   *     summary: Eliminar tarea
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       204:
   *         description: Tarea eliminada
   */
  app.delete(
    "/api/tasks/:id",
    authenticateToken,
    [param("id").isUUID()],
    handleValidationErrors,
    async (req: AuthRequest, res: Response) => {
      try {
        const task = await storage.getTask(req.params.id);
        if (!task) {
          return res.status(404).json({ error: "Task not found" });
        }

        await storage.deleteTask(req.params.id);
        res.status(204).send();
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /stats/{userId}:
   *   get:
   *     summary: Obtener estadísticas del usuario
   *     tags: [Stats]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Estadísticas
   */
  app.get(
    "/api/stats/:userId",
    authenticateToken,
    [param("userId").isUUID()],
    handleValidationErrors,
    async (req: AuthRequest, res: Response) => {
      try {
        const stats = await storage.getUserStats(req.params.userId);
        res.json(stats);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /users:
   *   get:
   *     summary: Listar usuarios (para asignación)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de usuarios
   */
  app.get("/api/users", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      // Don't return passwords
      const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
      }));
      res.json(safeUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /collaborators:
   *   get:
   *     summary: Obtener colaboradores de proyectos del usuario
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de colaboradores
   */
  app.get("/api/collaborators", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const collaborators = await storage.getAllCollaboratorsForUser(req.userId!);
      // Don't return passwords
      const safeCollaborators = collaborators.map(c => ({
        id: c.id,
        username: c.username,
        email: c.email,
      }));
      res.json(safeCollaborators);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /projects/{id}/collaborators:
   *   get:
   *     summary: Obtener colaboradores de un proyecto
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de colaboradores del proyecto
   */
  app.get(
    "/api/projects/:id/collaborators",
    authenticateToken,
    [param("id").isUUID()],
    handleValidationErrors,
    async (req: AuthRequest, res: Response) => {
      try {
        const project = await storage.getProject(req.params.id);
        if (!project) {
          return res.status(404).json({ error: "Project not found" });
        }

        // Check if user has access
        const isCreator = project.creatorId === req.userId;
        const isCollaborator = await storage.isUserCollaborator(project.id, req.userId!);

        if (!isCreator && !isCollaborator) {
          return res.status(403).json({ error: "Access denied" });
        }

        // Get collaborators and include the creator
        const collaborators = await storage.getProjectCollaborators(req.params.id);
        const creator = await storage.getUser(project.creatorId);
        
        // Combine and deduplicate
        const allUsers = creator ? [...collaborators, creator] : collaborators;
        const uniqueUsers = Array.from(
          new Map(allUsers.map(u => [u.id, u])).values()
        );

        const safeUsers = uniqueUsers.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
        }));
        
        res.json(safeUsers);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
