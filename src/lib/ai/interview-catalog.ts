import {
  interviewDomainSchema,
  interviewQuestionSchema,
  type InterviewDomain,
  type InterviewQuestion,
} from "@/lib/ai/interview-contracts";

export interface InterviewCatalog {
  domains: InterviewDomain[];
  questions: InterviewQuestion[];
}

const genericDomains = [
  {
    key: "business",
    label: "Business identity",
    priority: 100,
    required: true,
    description: "What the business is, where it operates, and its current context.",
    relevanceRules: [],
  },
  {
    key: "customers",
    label: "Customers",
    priority: 95,
    required: true,
    description: "Who the business serves and how customers engage with it.",
    relevanceRules: [],
  },
  {
    key: "offerings",
    label: "Offerings",
    priority: 90,
    required: true,
    description: "The products or services the business provides.",
    relevanceRules: [],
  },
  {
    key: "workflows",
    label: "Workflows",
    priority: 85,
    required: true,
    description: "The important processes, handoffs, and approvals in the business.",
    relevanceRules: [],
  },
  {
    key: "problems",
    label: "Problems",
    priority: 80,
    required: true,
    description: "The biggest operational problems and their impact.",
    relevanceRules: [],
  },
  {
    key: "goals",
    label: "Goals",
    priority: 75,
    required: true,
    description: "The outcomes the business wants to achieve.",
    relevanceRules: [],
  },
  {
    key: "people",
    label: "People and responsibilities",
    priority: 70,
    required: false,
    description: "The people, teams, roles, and responsibilities involved.",
    relevanceRules: [],
  },
  {
    key: "sales",
    label: "Sales",
    priority: 65,
    required: false,
    description: "How demand is generated, handled, and converted.",
    relevanceRules: [],
  },
  {
    key: "scheduling",
    label: "Scheduling",
    priority: 60,
    required: false,
    description: "Appointments, calendars, and timing constraints.",
    relevanceRules: [],
  },
  {
    key: "payments",
    label: "Payments",
    priority: 55,
    required: false,
    description: "Payment methods, cycles, and payment-related friction.",
    relevanceRules: [],
  },
  {
    key: "inventoryAssets",
    label: "Inventory and assets",
    priority: 50,
    required: false,
    description: "The physical or digital assets the business tracks.",
    relevanceRules: [],
  },
  {
    key: "communication",
    label: "Communication",
    priority: 45,
    required: false,
    description: "Communication channels, cadence, and communication issues.",
    relevanceRules: [],
  },
  {
    key: "tools",
    label: "Tools and integrations",
    priority: 40,
    required: false,
    description: "Software, integrations, and custom processes.",
    relevanceRules: [],
  },
  {
    key: "constraints",
    label: "Constraints",
    priority: 35,
    required: false,
    description: "Compliance, policies, limits, and risks.",
    relevanceRules: [],
  },
  {
    key: "automation",
    label: "Automation opportunities",
    priority: 30,
    required: false,
    description: "Manual work and opportunities for future automation.",
    relevanceRules: [],
  },
].map((domain) => interviewDomainSchema.parse(domain));

const genericQuestions = [
  ["business.description", "What does the business do, and what context should the system understand?", "business", 100],
  ["customers.segments", "Who are the main customers or customer groups?", "customers", 95],
  ["offerings.services", "What products or services does the business provide?", "offerings", 90],
  ["workflows.coreProcesses", "What are the most important processes the business performs?", "workflows", 85],
  ["problems.topProblems", "What are the biggest operational problems today?", "problems", 80],
  ["goals.objectives", "What outcomes would make the new system valuable?", "goals", 75],
  ["people.responsibilities", "Who owns the important responsibilities in the business?", "people", 70],
  ["sales.salesProcess", "How does the business currently move a customer from interest to purchase?", "sales", 65],
  ["scheduling.constraints", "What scheduling or timing constraints matter?", "scheduling", 60],
  ["payments.methods", "How does the business handle payments?", "payments", 55],
  ["inventoryAssets.trackedItems", "What inventory, equipment, or other assets need to be tracked?", "inventoryAssets", 50],
  ["communication.channels", "Which communication channels are important to the business?", "communication", 45],
  ["tools.software", "Which software or tools are already used?", "tools", 40],
  ["constraints.compliance", "What policies, compliance needs, or risks should be respected?", "constraints", 35],
  ["automation.opportunities", "Which manual steps would be most valuable to improve later?", "automation", 30],
].map(([key, prompt, domain, priority]) =>
  interviewQuestionSchema.parse({
    key,
    domain,
    prompt,
    kind: "textarea",
    required: Number(priority) >= 75,
    dependsOn: [],
    options: [],
    metadata: {
      targetPaths: [key],
      informationValue: priority,
    },
  })
);

export const defaultInterviewCatalog: InterviewCatalog = {
  domains: genericDomains,
  questions: genericQuestions,
};
