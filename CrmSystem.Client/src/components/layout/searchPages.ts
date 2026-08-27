// ==============================================================================
// CRM SYSTEM SEARCH: SIDEBAR PAGES & NAVIGATION REGISTRY
// ==============================================================================

export interface SearchPageItem {
  type: 'page';
  id: number;
  title: string;
  subtitle: string;
  route: string;
  keywords: string[];
}

export const SIDEBAR_PAGES: SearchPageItem[] = [
  {
    id: 1,
    type: 'page',
    title: 'Executive Dashboard',
    subtitle: 'Real-time KPIs, revenue & deal activity overview',
    route: '/dashboard',
    keywords: ['dashboard', 'home', 'kpi', 'revenue', 'overview', 'main', 'executive', 'metrics']
  },
  {
    id: 2,
    type: 'page',
    title: 'Customers',
    subtitle: 'Manage client accounts and contact profiles',
    route: '/customers',
    keywords: ['customers', 'clients', 'contacts', 'people', 'accounts']
  },
  {
    id: 3,
    type: 'page',
    title: 'Companies',
    subtitle: 'Corporate accounts & B2B organizations',
    route: '/companies',
    keywords: ['companies', 'organizations', 'b2b', 'corporate', 'business', 'accounts']
  },
  {
    id: 4,
    type: 'page',
    title: 'Leads & Prospects',
    subtitle: 'Sales prospects, acquisition channels & AI lead scoring',
    route: '/leads',
    keywords: ['leads', 'prospects', 'inbound', 'scoring', 'qualification', 'acquisition']
  },
  {
    id: 5,
    type: 'page',
    title: 'Deal Pipeline (Kanban)',
    subtitle: 'Visual opportunity stages & deal forecasting board',
    route: '/pipeline',
    keywords: ['pipeline', 'kanban', 'deals', 'opportunities', 'board', 'stages', 'forecast']
  },
  {
    id: 6,
    type: 'page',
    title: 'Contracts & E-Signatures',
    subtitle: 'Digital agreements, online signing & PDF receipts',
    route: '/contracts',
    keywords: ['contracts', 'agreements', 'signatures', 'e-sign', 'legal', 'documents', 'pdf']
  },
  {
    id: 7,
    type: 'page',
    title: 'Invoices & Billing',
    subtitle: 'Commercial invoices, tax calculations & payment status',
    route: '/invoices',
    keywords: ['invoices', 'billing', 'statements', 'tax', 'receipts', 'money']
  },
  {
    id: 8,
    type: 'page',
    title: 'Payment Transactions & Ledger',
    subtitle: 'Real-time ledger of received customer payments, Stripe & wires',
    route: '/payments',
    keywords: ['payments', 'transactions', 'ledger', 'stripe', 'checkout', 'receipts', 'wire', 'card', 'paid', 'collections']
  },
  {
    id: 9,
    type: 'page',
    title: 'Tasks & Calendar',
    subtitle: 'To-dos, follow-up calls & meeting scheduling',
    route: '/tasks',
    keywords: ['tasks', 'calendar', 'to-do', 'todos', 'schedule', 'followup', 'reminders']
  },
  {
    id: 9,
    type: 'page',
    title: 'Product Catalog',
    subtitle: 'Item inventory, SKUs & line-item pricing',
    route: '/products',
    keywords: ['products', 'items', 'catalog', 'sku', 'inventory', 'pricing', 'price']
  },
  {
    id: 10,
    type: 'page',
    title: 'Reports & Analytics',
    subtitle: 'Sales performance, conversion SLA & revenue forecast',
    route: '/reports',
    keywords: ['reports', 'analytics', 'charts', 'forecast', 'sla', 'performance', 'statistics']
  },

  {
    id: 12,
    type: 'page',
    title: 'System History & Audit Logs',
    subtitle: 'Field-level mutation logs & user activity trail',
    route: '/audit-logs',
    keywords: ['audit', 'logs', 'history', 'activity', 'system trail', 'changes', 'audit logs']
  },
  {
    id: 13,
    type: 'page',
    title: 'User Management',
    subtitle: 'User accounts, access roles & permissions',
    route: '/users',
    keywords: ['users', 'team', 'staff', 'employees', 'roles', 'permissions', 'admin']
  },
  {
    id: 14,
    type: 'page',
    title: 'System Settings',
    subtitle: 'Theme configuration, preferences & security controls',
    route: '/settings',
    keywords: ['settings', 'configuration', 'preferences', 'theme', 'security']
  },
  {
    id: 15,
    type: 'page',
    title: 'Lead Statuses Settings',
    subtitle: 'Customize lead qualification workflow stages',
    route: '/settings/lead-statuses',
    keywords: ['lead statuses', 'stages', 'qualification']
  },
  {
    id: 16,
    type: 'page',
    title: 'Lead Sources Settings',
    subtitle: 'Configure acquisition channels and marketing campaigns',
    route: '/settings/lead-sources',
    keywords: ['lead sources', 'sources', 'channels', 'campaigns']
  },
  {
    id: 17,
    type: 'page',
    title: 'Pipeline Stages Settings',
    subtitle: 'Configure Kanban stage names & win probabilities',
    route: '/settings/pipeline-stages',
    keywords: ['pipeline stages', 'deal stages', 'probabilities', 'kanban setup']
  },
  {
    id: 18,
    type: 'page',
    title: 'Customer Reports',
    subtitle: 'Customer growth trends, B2B breakdown & acquisition velocity',
    route: '/customers/reports',
    keywords: ['customer report', 'customer analytics', 'client report', 'customer growth', 'customer metrics']
  },
  {
    id: 19,
    type: 'page',
    title: 'Company Reports',
    subtitle: 'Corporate account segmentation, industry distribution & B2B portfolio',
    route: '/companies/reports',
    keywords: ['company report', 'company analytics', 'b2b report', 'industry report', 'corporate metrics']
  },
  {
    id: 20,
    type: 'page',
    title: 'Lead Reports & SLA',
    subtitle: 'Lead conversion funnel, acquisition channels & response SLA health',
    route: '/leads/reports',
    keywords: ['lead report', 'funnel report', 'lead analytics', 'sla report', 'lead sources', 'conversion']
  },
  {
    id: 21,
    type: 'page',
    title: 'Pipeline & Velocity Reports',
    subtitle: 'Stage valuation distribution, win rate trends & sales cycle duration',
    route: '/pipeline/reports',
    keywords: ['pipeline report', 'deal report', 'win rate report', 'velocity report', 'forecast report']
  },
  {
    id: 22,
    type: 'page',
    title: 'Contract Reports',
    subtitle: 'Contract valuation, e-signature status & agreement volume',
    route: '/contracts/reports',
    keywords: ['contract report', 'agreement report', 'signature report', 'e-sign analytics']
  },
  {
    id: 23,
    type: 'page',
    title: 'Invoice & Revenue Reports',
    subtitle: 'Collected cash revenue, pending receivables & billing statements',
    route: '/invoices/reports',
    keywords: ['invoice report', 'revenue report', 'financial report', 'billing analytics', 'cash collections']
  },
  {
    id: 24,
    type: 'page',
    title: 'Task & Activity Reports',
    subtitle: 'Task resolution, interaction channels & team productivity metrics',
    route: '/tasks/reports',
    keywords: ['task report', 'activity report', 'productivity metrics', 'to-do report']
  },
  {
    id: 25,
    type: 'page',
    title: 'Team Leaderboard Reports',
    subtitle: 'Sales rep revenue production, closed deals & rep win rates',
    route: '/users/reports',
    keywords: ['user report', 'rep report', 'leaderboard', 'sales rep performance', 'team report']
  },
  {
    id: 26,
    type: 'page',
    title: 'Audit Trail Reports',
    subtitle: 'System mutation frequency, database change logs & security audit',
    route: '/audit-logs/reports',
    keywords: ['audit report', 'mutation report', 'history report', 'compliance analytics']
  }
];

export function searchSidebarPages(query: string): SearchPageItem[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();

  return SIDEBAR_PAGES.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.subtitle.toLowerCase().includes(q) ||
    p.keywords.some(k => k.includes(q))
  );
}
