/**
 * The playground's starting diagrams.
 *
 * One per shape Pele's parser handles: a flow, a sequence, a class, a state
 * machine, an entity model, a schedule, a share and a commit graph. The source
 * is ordinary Mermaid, so a reader can copy a template into any Mermaid surface
 * and keep editing; the playground only supplies the first line.
 */

export interface DiagramTemplate {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly chart: string;
}

export const diagramTemplates: ReadonlyArray<DiagramTemplate> = [
  {
    id: "sequence-api",
    name: "API request",
    category: "Sequence",
    chart: `sequenceDiagram
  participant C as Client
  participant S as Server
  participant DB as Database
  C->>S: POST /api/users
  S->>S: Validate input
  S->>DB: INSERT user
  DB-->>S: User created
  S-->>C: 201 Created`,
  },
  {
    id: "flowchart-release",
    name: "Release flow",
    category: "Flowchart",
    chart: `flowchart TD
  A([Push]) --> B[Build]
  B --> C{Tests pass?}
  C -->|Yes| D[Stage]
  C -->|No| E[Notify]
  E --> B
  D --> F([Deploy])`,
  },
  {
    id: "class-model",
    name: "Content model",
    category: "Class",
    chart: `classDiagram
  class User {
    +String name
    +login()
  }
  class Post {
    +String title
    +publish()
  }
  class Comment {
    +String body
    +edit()
  }
  User "1" --> "*" Post : writes
  Post "1" --> "*" Comment : has`,
  },
  {
    id: "state-order",
    name: "Order state",
    category: "State",
    chart: `stateDiagram-v2
  [*] --> Pending
  Pending --> Paid : payment
  Paid --> Packed : pick
  Packed --> Shipped : label
  Shipped --> [*]
  Pending --> Cancelled : cancel`,
  },
  {
    id: "er-shop",
    name: "Shop entities",
    category: "Entity",
    chart: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE : contains
  PRODUCT ||--o{ LINE : appears
  CUSTOMER {
    int id PK
    string email
  }
  ORDER {
    int id PK
    date created
  }`,
  },
  {
    id: "gantt-launch",
    name: "Launch plan",
    category: "Gantt",
    chart: `gantt
  title Launch plan
  dateFormat YYYY-MM-DD
  section Plan
  Scope      :a1, 2026-01-05, 10d
  Design     :a2, after a1, 8d
  section Build
  Frontend   :b1, after a2, 14d
  Backend    :b2, after a2, 14d
  section Ship
  Test       :c1, after b1, 5d
  Deploy     :c2, after c1, 2d`,
  },
  {
    id: "pie-stack",
    name: "Stack share",
    category: "Pie",
    chart: `pie title Stack share
  "React" : 42
  "Effect" : 24
  "GPUix" : 18
  "Other" : 16`,
  },
  {
    id: "git-branches",
    name: "Branch graph",
    category: "Git",
    chart: `gitGraph
  commit
  commit
  branch feature
  checkout feature
  commit
  commit
  checkout main
  merge feature
  commit`,
  },
];

export const defaultTemplate = diagramTemplates[0];

export const templateCategories = [
  ...new Set(diagramTemplates.map((template) => template.category)),
];
