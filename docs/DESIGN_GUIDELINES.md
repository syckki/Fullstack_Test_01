# Design Guidelines: Collaborative Project Management Platform

## Design Approach

**Selected System**: Linear/Notion-inspired productivity aesthetic  
**Rationale**: Utility-focused application requiring clarity, efficiency, and information density. Drawing from Linear's clean interface and Notion's organizational patterns.

**Core Principles**:
- Information clarity over decoration
- Efficient use of space for data-heavy views
- Consistent, predictable interactions
- Quick visual scanning and task completion

---

## Typography

**Font Stack**: 
- Primary: Inter (Google Fonts) - body text, UI elements, data
- Monospace: JetBrains Mono - task IDs, timestamps, technical data

**Hierarchy**:
- Page titles: text-3xl font-semibold (30px)
- Section headers: text-xl font-semibold (20px)
- Card titles: text-lg font-medium (18px)
- Body text: text-base (16px)
- Labels/meta: text-sm text-gray-600 (14px)
- Badges/tags: text-xs font-medium uppercase tracking-wide (12px)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, and 12
- Component padding: p-4 or p-6
- Section spacing: gap-6 or gap-8
- Card margins: m-4
- Input fields: p-3
- Icon spacing: mr-2, ml-2

**Grid Structure**:
- Dashboard: 3-column grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Project list: 2-column cards on desktop, single on mobile
- Task table: Full-width with fixed sidebar (w-64)
- Filters sidebar: Fixed 240px width on desktop, collapsible on mobile

---

## Component Library

### Navigation
- **Top navbar**: Fixed header with logo (left), search bar (center), user profile dropdown (right)
- **Sidebar navigation**: Persistent left sidebar with icons + labels, active state highlighting
- Sections: Dashboard, My Projects, All Tasks, Statistics

### Dashboard
- **Stats cards**: 4-column grid showing total projects, total tasks, tasks by state (pending/in progress/done)
- Card structure: Large number (text-4xl), label below, subtle icon in corner
- **Recent activity**: List of recent task updates with avatar, action, timestamp

### Project Management
- **Project cards**: Grid layout with project name, description preview, member avatars (max 5 visible), task count badge
- Hover state reveals edit/delete actions for creators
- **Create project modal**: Centered overlay with form (name, description, initial collaborators)
- **Collaborator management**: Inline list with add button, remove action on hover

### Task Management
- **Task table view**: Compact rows with columns: checkbox, task name, status badge, priority indicator, assignee avatar, project tag, due date
- **Filters panel**: Left sidebar with dropdowns for status, priority, project, assigned user
- **Quick actions**: Inline edit icon, status dropdown, delete button
- **Create task form**: Modal with fields stacked vertically, clear visual separation between sections

### Forms & Inputs
- **Text inputs**: Rounded corners (rounded-lg), border focus state, label above input
- **Dropdowns**: Custom styled selects with chevron icon
- **Buttons**: Primary (solid), Secondary (outline), Destructive (red accent)
- **Validation**: Inline error messages below fields in red text

### Data Display
- **Status badges**: Pill-shaped with subtle background - pending (gray), in_progress (blue), done (green)
- **Priority indicators**: Colored dots - low (gray), medium (yellow), high (red)
- **Avatars**: Circular, 32px default, stacked with -ml-2 for groups
- **Empty states**: Centered icon + message + CTA button

### Modals & Overlays
- **Modal backdrop**: Semi-transparent overlay (bg-black/50)
- **Modal content**: Centered, max-width 500px, rounded-xl, shadow-2xl
- **Close button**: Top-right X icon

---

## Minimal Animations

Use sparingly for feedback only:
- Hover state transitions: 150ms ease
- Modal fade-in: 200ms
- Dropdown expand: 150ms
- No scroll animations or loading skeletons

---

## Authentication Pages

**Layout**: Split screen - left side (40%) with branding/illustration, right side (60%) with form
**Form structure**: Centered vertically, max-width 400px, logo at top, title, input fields stacked, submit button full-width, link to alternate action below

---

## Images

No hero images needed. Use:
- **Empty state illustrations**: Simple line art for empty project/task lists
- **User avatars**: Generated initials on colored backgrounds or uploaded photos
- **Logo**: Simple icon-based logo in top navbar