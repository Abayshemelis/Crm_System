import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  Menu, X, Moon, Sun, ArrowRight, Users, Building2,
  Target, Calendar, Package, BarChart3, CheckCircle,
  Phone, Mail, MapPin, Clock, Globe, ChevronDown,
  Activity, Shield, DollarSign, Award, Layers, HelpCircle,
  CheckCircle2, AlertCircle, FileText, Check, Zap,
  TrendingUp, Linkedin, Instagram, Send,
  Sparkles, FileSignature, CreditCard, Sliders, History,
  Home, Info, Briefcase, LogIn
} from 'lucide-react';
import { AuthLoginForm } from '../components/auth/AuthLoginForm';
import { PublicAiAssistant } from '../components/ai/PublicAiAssistant';
import { PhoneInput } from '../components/ui/PhoneInput';
import { SelectDown, SelectOption } from '../components/ui/SelectDown';
import { parsePhoneNumber, validatePhoneNumber } from '../components/ui/countryData';
import { validateName, validateEmail } from '../lib/validators';
import './LandingPage.css';

const LEAD_SOURCE_OPTIONS: SelectOption[] = [
  { value: 'Google Search', label: 'Google Search' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Telegram / Social Media', label: 'Telegram / Social Media' },
  { value: 'Colleague / Referral', label: 'Colleague / Referral' },
  { value: 'Direct Website', label: 'Direct Website' },
  { value: 'Event / Webinar', label: 'Event / Webinar' },
  { value: 'Other', label: 'Other' },
];

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', source: 'Google Search', subject: '', message: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isCursorActive, setIsCursorActive] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>({
    totalCustomers: 11,
    totalCompanies: 4,
    totalLeads: 13,
    pipelineValue: 12049,
    totalProducts: 7,
    pendingTasks: 6,
    winRate: 94.2,
    averageDealSize: 15400,
    dealsClosed: 8,
    totalRevenue: 123200
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const setHeroRef = useCallback((node: HTMLElement | null) => {
    heroRef.current = node;
  }, []);

  useEffect(() => {
    // Check localStorage - default to white/light theme unless explicitly saved as 'dark'
    const savedTheme = localStorage.getItem('theme');
    const shouldUseDark = savedTheme === 'dark';
    setIsDarkMode(shouldUseDark);
    document.documentElement.setAttribute('data-theme', shouldUseDark ? 'dark' : 'light');

    // Scroll tracking for navbar styling
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user, navigate]);

  // Lock background body scroll and listen for Escape key when mobile navigation menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  // Mouse cursor tracking inside hero section
  useEffect(() => {
    if (!heroRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = heroRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCursorPosition({ x, y });
      setIsCursorActive(true);
    };

    const handleMouseLeave = () => setIsCursorActive(false);
    const handleMouseEnter = () => setIsCursorActive(true);

    const el = heroRef.current;
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [heroRef]);

  // Fetch public CRM stats from backend API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const data = await api.get('/api/dashboard/public-stats');
        setDashboardData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load live CRM data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const getStageColor = (stageName: string) => {
    const colors: Record<string, string> = {
      'new': '#6366f1',
      'qualified': '#3b82f6',
      'proposal': '#10b981',
      'negotiation': '#f59e0b',
      'closing': '#ef4444',
      'won': '#22c55e',
      'lost': '#6b7280'
    };
    if (!stageName) return '#6366f1';
    return colors[stageName.toLowerCase()] || '#6366f1';
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleContactFieldChange = (field: string, value: string) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  const validateContactForm = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Full Name Validation (presence, min 2 chars, max 100 chars, no numbers-only)
    const nameErr = validateName(contactForm.name, 'Full name', 2, 100);
    if (nameErr) {
      errs.name = nameErr;
    }

    // 2. Email Address Validation (presence, valid RFC format with real domain/TLD, max 254 chars)
    const emailErr = validateEmail(contactForm.email, true, 'Email address');
    if (emailErr) {
      errs.email = emailErr;
    }

    // 3. Phone Number Validation (country-aware if entered)
    if (contactForm.phone && contactForm.phone.trim()) {
      const parsed = parsePhoneNumber(contactForm.phone);
      const phoneErr = validatePhoneNumber(parsed.nationalNumber, parsed.country);
      if (phoneErr) {
        errs.phone = phoneErr;
      }
    }

    // 4. Subject Validation (presence, min 2 chars, max 150 chars)
    const subjectErr = validateName(contactForm.subject, 'Subject', 2, 150);
    if (subjectErr) {
      errs.subject = subjectErr;
    }

    // 5. Message Validation (presence, min 5 chars, max 2000 chars)
    if (!contactForm.message || !contactForm.message.trim()) {
      errs.message = 'Message is required';
    } else if (contactForm.message.trim().length < 5) {
      errs.message = 'Message must be at least 5 characters';
    } else if (contactForm.message.trim().length > 2000) {
      errs.message = 'Message cannot exceed 2,000 characters';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateContactForm()) {
      return;
    }

    setIsSubmittingContact(true);
    try {
      await api.post('/api/dashboard/contact', contactForm);
      setFormSubmitted(true);
      setFormErrors({});
      // Refresh dashboard stats so the new lead shows up immediately
      const data = await api.get('/api/dashboard/public-stats');
      setDashboardData(data);
      setTimeout(() => {
        setFormSubmitted(false);
        setContactForm({ name: '', email: '', phone: '', source: 'Google Search', subject: '', message: '' });
      }, 4000);
    } catch (err: any) {
      console.error('Failed to submit contact message:', err);
      setSubmitError(err?.message || 'Failed to send message. Please check your information and try again.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const services = [
    {
      icon: Users,
      title: 'Customer Relationship Management',
      stat: `${dashboardData?.totalCustomers ?? 0} Active Customers`,
      description: 'Unified account records with contact details, company links, custom tags, and complete historical audit trails.'
    },
    {
      icon: Building2,
      title: 'Corporate Account Intelligence',
      stat: `${dashboardData?.totalCompanies ?? 0} Linked Companies`,
      description: 'Manage B2B corporate structures, multiple contact links per company, and total open pipeline value.'
    },
    {
      icon: Target,
      title: 'Lead Acquisition & Conversion',
      stat: `${dashboardData?.totalLeads ?? 0} Managed Leads`,
      description: 'Track lead channels, qualify prospects, and convert qualified leads into linked customer and deal records with one click.'
    },
    {
      icon: Sparkles,
      title: 'AI Lead Assistant & Scoring',
      stat: 'Predictive Scoring & Insights',
      description: 'Automated 0-100 lead scoring, SLA response alert tracking, and AI-assisted email generation for reps.'
    },
    {
      icon: FileSignature,
      title: 'Contracts & E-Signatures',
      stat: 'Digital Document Signing',
      description: 'Draft contracts, share public signing links, capture e-signatures online, and auto-export signed PDFs.'
    },
    {
      icon: CreditCard,
      title: 'Invoicing & Stripe Payments',
      stat: 'Live Online Checkout',
      description: 'Issue invoices, collect credit card payments via Stripe integration, and track payment status in real-time.'
    },
    {
      icon: Layers,
      title: 'Opportunity Pipeline & Forecasting',
      stat: `$${Math.round((dashboardData?.pipelineValue ?? 0) / 1000)}K Active Pipeline`,
      description: 'Drag-and-drop Kanban deal board across customizable pipeline stages with win probability metrics.'
    },
    {
      icon: Package,
      title: 'Product Catalog & Order Items',
      stat: `${dashboardData?.totalProducts ?? 0} Active Products`,
      description: 'Catalog management for items, SKUs, category classifications, and line-item pricing attached to deal opportunities.'
    },
    {
      icon: Calendar,
      title: 'Task & Calendar Operations',
      stat: `${dashboardData?.pendingTasks ?? 0} Pending Tasks`,
      description: 'Month, week, and day calendar scheduling with overdue tracking, priority tags, and representative assignments.'
    }
  ];

  const crmFeatures = [
    {
      icon: CheckCircle,
      title: 'Customer Management',
      description: 'Maintain detailed customer profiles, activity history, notes, and B2B corporate links.'
    },
    {
      icon: Building2,
      title: 'Company Management',
      description: 'Track corporate entities, assign primary reps, and analyze account portfolio value.'
    },
    {
      icon: Target,
      title: 'Lead Management & Conversion',
      description: 'Capture leads, track acquisition sources, and execute seamless direct lead conversions.'
    },
    {
      icon: Sparkles,
      title: 'AI Lead Scoring & Assistant',
      description: 'Real-time Hot/Warm/Cold scoring (0-100), SLA response breach alerts, and predictive recommendations.'
    },
    {
      icon: FileSignature,
      title: 'Digital Contracts & E-Signatures',
      description: 'Create contracts, share public e-signature links, track agreement statuses, and generate PDF receipts.'
    },
    {
      icon: CreditCard,
      title: 'Invoices & Stripe Payment Gateway',
      description: 'Generate customer invoices, accept instant Stripe payments, and maintain payment history.'
    },
    {
      icon: Sliders,
      title: 'Custom Fields Engine',
      description: 'Add custom fields (text, number, date, dropdown) across Leads, Customers, and Opportunities.'
    },
    {
      icon: Layers,
      title: 'Sales Pipeline Kanban',
      description: 'Visualize deal progression, drag-and-drop between stages, and monitor stage transition velocity.'
    },
    {
      icon: Package,
      title: 'Product Catalog & Pricing',
      description: 'Manage products, SKUs, stock levels, and attach line items directly to opportunity proposals.'
    },
    {
      icon: Calendar,
      title: 'Task & Calendar Scheduler',
      description: 'Schedule follow-up tasks, view calendar agendas, set due date reminders, and assign team owners.'
    },
    {
      icon: Activity,
      title: 'Activity Timeline Tracking',
      description: 'Log phone calls, emails, meetings, and follow-ups with automatic timestamps.'
    },
    {
      icon: History,
      title: 'Field-Level Audit Trail',
      description: 'Complete audit logging tracking every field change, old/new values, timestamps, and user IDs.'
    }
  ];

  const faqs = [
    {
      question: 'What modules are included in the CRM system?',
      answer: 'Our CRM includes Customer & Company Management, Lead Acquisition & Conversion, AI Lead Scoring, Opportunity Pipeline Kanban, Contracts & E-Signatures, Invoices & Stripe Payments, Custom Fields Engine, Task Calendar, Activity Tracking, and Role Governance.'
    },
    {
      question: 'How do Digital Contracts and E-Signatures work?',
      answer: 'You can create contracts directly from opportunities or customers, generate a secure public e-signature link, send it to clients, and collect signatures online. Once signed, a PDF is automatically generated and an invoice can be created instantly.'
    },
    {
      question: 'Is online payment processing supported for invoices?',
      answer: 'Yes! The system integrates directly with Stripe Payment Gateway. Clients can pay their invoices online via credit card, and invoice statuses update automatically to Paid upon completion.'
    },
    {
      question: 'How does the AI Lead Scoring & Assistant help sales reps?',
      answer: 'The AI Lead Assistant evaluates prospect engagement, calculates a 0-100 lead score (Hot/Warm/Cold), monitors SLA response times, and suggests next best actions and email templates.'
    },
    {
      question: 'Can leads be converted directly into customers and opportunities?',
      answer: 'Absolutely. With one click, active leads (even from New status) convert into linked customer, company, and initial deal records with full audit history preservation.'
    },
    {
      question: 'What security and access controls are supported?',
      answer: 'The system enforces role-based access control (Admin, Manager, SalesRep) ensuring data privacy, restricted administrative settings, and complete field-level audit logs for all data mutations.'
    }
  ];

  return (
    <div className={`landing-page ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Navigation Bar */}
      <nav className={`landing-nav ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-logo" onClick={() => scrollToSection('home')} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">CRM</span>
            <span className="logo-text">System</span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="nav-links desktop-only">
            <a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>Home</a>
            <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>About</a>
            <a href="#services" onClick={(e) => { e.preventDefault(); scrollToSection('services'); }}>Services</a>
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
            <a href="#analytics" onClick={(e) => { e.preventDefault(); scrollToSection('analytics'); }}>Analytics</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Contact</a>
          </div>

          <div className="nav-actions">
            <button className="theme-toggle desktop-only" onClick={toggleTheme} aria-label="Toggle theme">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="btn-secondary desktop-only" onClick={() => navigate('/login')}>
              Login
            </button>
            <button className="btn-primary desktop-only" onClick={() => navigate('/login')}>
              Get Started
            </button>
            <button 
              className="mobile-menu-btn" 
              onClick={() => setMobileMenuOpen(true)} 
              aria-label="Open navigation sidebar"
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Backdrop (Tap outside sidebar to close) */}
      <div 
        className={`mobile-menu-backdrop ${mobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setMobileMenuOpen(false)} 
        aria-hidden={!mobileMenuOpen}
      />

      {/* Mobile Navigation Sidebar Drawer (Left Slide-in) */}
      <aside 
        className={`mobile-sidebar-drawer ${mobileMenuOpen ? 'open' : ''}`}
        aria-label="Mobile Navigation Sidebar"
        aria-hidden={!mobileMenuOpen}
      >
        {/* Sidebar Top Header with Logo, Theme Icon Button, and Close Button */}
        <div className="mobile-sidebar-header">
          <div className="nav-logo" onClick={() => { setMobileMenuOpen(false); scrollToSection('home'); }} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">CRM</span>
            <span className="logo-text">System</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button 
              className="mobile-sidebar-icon-btn" 
              onClick={toggleTheme} 
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              className="mobile-sidebar-close-btn" 
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation sidebar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Sidebar Nav Links with Icons */}
        <nav className="mobile-sidebar-nav">
          <a 
            href="#home" 
            className="mobile-sidebar-link"
            onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}
          >
            <Home size={18} className="sidebar-link-icon" />
            <span>Home</span>
          </a>
          <a 
            href="#about" 
            className="mobile-sidebar-link"
            onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}
          >
            <Info size={18} className="sidebar-link-icon" />
            <span>About</span>
          </a>
          <a 
            href="#services" 
            className="mobile-sidebar-link"
            onClick={(e) => { e.preventDefault(); scrollToSection('services'); }}
          >
            <Briefcase size={18} className="sidebar-link-icon" />
            <span>Services</span>
          </a>
          <a 
            href="#features" 
            className="mobile-sidebar-link"
            onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}
          >
            <Zap size={18} className="sidebar-link-icon" />
            <span>Features</span>
          </a>
          <a 
            href="#analytics" 
            className="mobile-sidebar-link"
            onClick={(e) => { e.preventDefault(); scrollToSection('analytics'); }}
          >
            <BarChart3 size={18} className="sidebar-link-icon" />
            <span>Analytics</span>
          </a>
          <a 
            href="#contact" 
            className="mobile-sidebar-link"
            onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}
          >
            <Mail size={18} className="sidebar-link-icon" />
            <span>Contact</span>
          </a>
        </nav>

        {/* Sidebar Footer with Side-by-Side Actions */}
        <div className="mobile-sidebar-footer">
          <div className="mobile-sidebar-actions-grid">
            <button 
              className="btn-secondary mobile-sidebar-btn" 
              onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
            >
              <LogIn size={15} /> Login
            </button>
            <button 
              className="btn-primary mobile-sidebar-btn" 
              onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
            >
              Get Started <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* 1. Hero Section (#home) */}
      <section id="home" className="hero-section" ref={setHeroRef}>
        <div className="dot-grid-background">
          <div className="dot-grid-base" />
          <div
            className={`dot-grid-hover ${isCursorActive ? 'active' : ''}`}
            style={{
              '--cursor-x': `${cursorPosition.x}px`,
              '--cursor-y': `${cursorPosition.y}px`
            } as React.CSSProperties}
          />
          <div className="glow-orb" />
        </div>
        <div className="hero-container">
          <div className="hero-content">
            <span className="hero-eyebrow">Enterprise CRM & Sales Execution Platform</span>
            <h1>Manage <span className="gradient-text">Customers, Leads & Sales</span> with Live Insights</h1>
            <p>Unify customer records, corporate accounts, sales pipelines, product catalogs, and task calendars into one high-performance CRM system.</p>

            <div className="hero-buttons">
              <button className="btn-primary" onClick={() => navigate('/login')}>
                Open CRM Application <ArrowRight size={16} />
              </button>
              <button className="btn-secondary" onClick={() => scrollToSection('about')}>
                Learn More
              </button>
            </div>

            {/* Hero Live Backend Stats */}
            <div className="hero-stats" style={{ marginTop: '2.5rem' }}>
              <div className="hero-stat">
                <div className="stat-number">{isLoading ? '...' : dashboardData?.totalCustomers ?? 0}</div>
                <div className="stat-label">Active Accounts</div>
              </div>
              <div className="hero-stat">
                <div className="stat-number">{isLoading ? '...' : `$${Math.round((dashboardData?.totalRevenue ?? 0) / 1000)}K`}</div>
                <div className="stat-label">Won Revenue</div>
              </div>
              <div className="hero-stat">
                <div className="stat-number">{isLoading ? '...' : `${dashboardData?.winRate ?? 94.2}%`}</div>
                <div className="stat-label">Win Rate</div>
              </div>
            </div>
          </div>

          {/* Hero Live Dashboard Mockup Preview */}
          <div className="hero-visual">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', fontWeight: 600 }}>LIVE CRM DASHBOARD PREVIEW</span>
              </div>
              <div className="preview-body">
                <div className="preview-kpi-grid">
                  <div className="preview-kpi-card">
                    <Users size={16} className="kpi-icon" />
                    <div className="kpi-value">{isLoading ? '...' : dashboardData?.totalCustomers ?? 0}</div>
                    <div className="kpi-label">Customers</div>
                  </div>
                  <div className="preview-kpi-card">
                    <Target size={16} className="kpi-icon" />
                    <div className="kpi-value">{isLoading ? '...' : dashboardData?.totalLeads ?? 0}</div>
                    <div className="kpi-label">Leads</div>
                  </div>
                  <div className="preview-kpi-card">
                    <CheckCircle size={16} className="kpi-icon" />
                    <div className="kpi-value">{isLoading ? '...' : dashboardData?.dealsClosed ?? 0}</div>
                    <div className="kpi-label">Closed Won</div>
                  </div>
                  <div className="preview-kpi-card">
                    <BarChart3 size={16} className="kpi-icon" />
                    <div className="kpi-value">{isLoading ? '...' : `$${Math.round((dashboardData?.totalRevenue ?? 0) / 1000)}K`}</div>
                    <div className="kpi-label">Revenue</div>
                  </div>
                </div>

                <div className="preview-middle-section">
                  <div className="preview-chart-section">
                    <div className="chart-header">
                      <h4>Active Pipeline Value</h4>
                      <div className="chart-summary">{isLoading ? '...' : `$${Math.round((dashboardData?.pipelineValue ?? 0) / 1000)}K Total`}</div>
                    </div>
                    <div className="bar-chart">
                      <div className="bar" style={{ height: '65%' }}></div>
                      <div className="bar" style={{ height: '85%' }}></div>
                      <div className="bar" style={{ height: '50%' }}></div>
                      <div className="bar" style={{ height: '95%' }}></div>
                      <div className="bar" style={{ height: '75%' }}></div>
                      <div className="bar" style={{ height: '60%' }}></div>
                    </div>
                    <div className="chart-labels">
                      <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                    </div>
                  </div>

                  <div className="preview-leads-section">
                    <h4>Recent Prospects</h4>
                    <div className="leads-list">
                      {isLoading ? (
                        <div className="lead-item">Loading prospects...</div>
                      ) : dashboardData?.recentLeads?.length > 0 ? (
                        dashboardData.recentLeads.slice(0, 4).map((lead: any, index: number) => {
                          const date = lead.date ? new Date(lead.date) : null;
                          const formattedDate = date && !isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent';
                          return (
                            <div key={index} className="lead-item">
                              <div className="lead-info" style={{ minWidth: 0 }}>
                                <div className="lead-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                              </div>
                              <div className={`lead-status ${(lead.status || 'new').toLowerCase().replace(/\s+/g, '-')}`}>
                                {lead.status || 'New'}
                              </div>
                              <div className="lead-date">{formattedDate}</div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="lead-item">No recent prospects</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="preview-pipeline-stages">
                  {isLoading ? (
                    <div className="pipeline-stage">Loading...</div>
                  ) : dashboardData?.pipelineStages?.length > 0 ? (
                    dashboardData.pipelineStages.map((stage: any, index: number) => (
                      <div key={index} className="pipeline-stage" style={{ background: getStageColor(stage.name) }}>
                        <div className="stage-count">{stage.count}</div>
                        <div className="stage-name">{stage.name || 'Stage'}</div>
                      </div>
                    ))
                  ) : (
                    <div className="pipeline-stage">No stages</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. About Section (#about) */}
      <section id="about" style={{ background: 'var(--bg-alt)' }}>
        <div className="section-container">
          <div className="section-header">
            <span className="section-pill">About Our CRM Platform</span>
            <h2>Built for Modern High-Growth Teams</h2>
            <p>Our CRM unifies relational customer databases, lead processing pipelines, opportunity management, and real-time business intelligence into a seamless user experience.</p>
          </div>

          <div className="about-cards-grid">
            <div className="glass-panel about-card">
              <div className="card-icon-box">
                <Zap size={28} />
              </div>
              <h3>Real-Time Operational Sync</h3>
              <p>Direct EF Core database query binding ensures every deal update, lead qualification, or task completion instantly reflects across dashboards and analytics.</p>
            </div>

            <div className="glass-panel about-card">
              <div className="card-icon-box">
                <Shield size={28} />
              </div>
              <h3>Enterprise Role Governance</h3>
              <p>Strict role-based permissions safeguard customer contacts and corporate data, granting Admin, Manager, and SalesRep role boundaries.</p>
            </div>

            <div className="glass-panel about-card">
              <div className="card-icon-box">
                <TrendingUp size={28} />
              </div>
              <h3>Pipeline Velocity</h3>
              <p>Automate stage transitions, track deal age, and monitor win probability ratios to maximize sales revenue execution.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Services Section (#services) */}
      <section id="services">
        <div className="section-container">
          <div className="section-header">
            <span className="section-pill">CRM Core Services</span>
            <h2>Complete Sales & Account Services</h2>
            <p>Every service needed to acquire prospects, manage accounts, track inventory, and close deals.</p>
          </div>

          <div className="services-grid">
            {services.map((srv, idx) => {
              const IconComponent = srv.icon;
              return (
                <div key={idx} className="glass-panel service-card">
                  <div className="service-card-header">
                    <div className="card-icon-box small">
                      <IconComponent size={22} />
                    </div>
                    <div>
                      <h3>{srv.title}</h3>
                      <span className="service-stat">{srv.stat}</span>
                    </div>
                  </div>
                  <p>{srv.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Features Section (#features) */}
      <section id="features" style={{ background: 'var(--bg-alt)' }}>
        <div className="section-container">
          <div className="section-header">
            <span className="section-pill">System Capabilities</span>
            <h2>End-to-End CRM Features</h2>
            <p>Built with precision for enterprise scalability, security, and sales team speed.</p>
          </div>

          <div className="features-grid">
            {crmFeatures.map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <div key={idx} className="feature-card glass-panel">
                  <div className="feature-icon card-icon-box">
                    <IconComp size={24} />
                  </div>
                  <h3>{feat.title}</h3>
                  <p>{feat.description}</p>
                </div>
              );
            })}
          </div>

          {/* Advanced Enterprise Modules Highlight Banner */}
          <div className="enterprise-banner">
            <div className="enterprise-header">
              <span className="section-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>⚡ High-Velocity Sales Engine</span>
              <h3>Advanced Enterprise Modules</h3>
              <p>Specialized built-in tools for AI predictions, online contract signing, Stripe payment gateways, and custom field customization.</p>
            </div>

            <div className="enterprise-modules-grid">
              <div className="glass-panel module-card card-ai">
                <div className="card-icon-box module-icon-ai">
                  <Sparkles size={26} />
                </div>
                <h4>AI Lead Assistant & Scoring</h4>
                <p>Automated 0-100 scoring based on interactions, SLA response breach alerts, and AI next-best-action email recommendations.</p>
              </div>

              <div className="glass-panel module-card card-contract">
                <div className="card-icon-box module-icon-contract">
                  <FileSignature size={26} />
                </div>
                <h4>E-Signatures & Contract PDFs</h4>
                <p>Generate contract agreements, share public signing link tokens, capture client digital signatures online, and auto-export signed PDFs.</p>
              </div>

              <div className="glass-panel module-card card-stripe">
                <div className="card-icon-box module-icon-stripe">
                  <CreditCard size={26} />
                </div>
                <h4>Stripe Online Invoicing</h4>
                <p>Direct credit card checkout integration via Stripe API. Invoices auto-update to Paid with client payment receipts.</p>
              </div>

              <div className="glass-panel module-card card-custom">
                <div className="card-icon-box module-icon-custom">
                  <Sliders size={26} />
                </div>
                <h4>Custom Fields & Audit Log</h4>
                <p>Extend Leads, Customers, and Opportunities with custom fields while maintaining deep field-level audit trail history.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Live Analytics Section (#analytics) */}
      <section id="analytics">
        <div className="section-container">
          <div className="section-header">
            <span className="section-pill">Live Business Intelligence</span>
            <h2>Real-Time Dashboard Analytics & Reports</h2>
            <p>Direct backend metric synchronization delivering accuracy for executives and sales leads.</p>
          </div>

          {/* Analytics Live KPI Cards - Compact UI-Friendly Grid */}
          <div className="landing-analytics-kpi-grid">
            <div className="landing-kpi-card glass-panel">
              <div className="landing-kpi-top">
                <div className="landing-kpi-icon-box accent">
                  <Users size={18} />
                </div>
                <span className="landing-kpi-badge green">+14% MoM</span>
              </div>
              <div className="landing-kpi-number">{isLoading ? '...' : (dashboardData?.totalCustomers ?? 0).toLocaleString()}</div>
              <div className="landing-kpi-label">Total Customers</div>
            </div>

            <div className="landing-kpi-card glass-panel">
              <div className="landing-kpi-top">
                <div className="landing-kpi-icon-box blue">
                  <Target size={18} />
                </div>
                <span className="landing-kpi-badge blue">Active</span>
              </div>
              <div className="landing-kpi-number">{isLoading ? '...' : (dashboardData?.totalLeads ?? 0).toLocaleString()}</div>
              <div className="landing-kpi-label">Managed Leads</div>
            </div>

            <div className="landing-kpi-card glass-panel">
              <div className="landing-kpi-top">
                <div className="landing-kpi-icon-box emerald">
                  <DollarSign size={18} />
                </div>
                <span className="landing-kpi-badge emerald">Won</span>
              </div>
              <div className="landing-kpi-number">{isLoading ? '...' : `$${Math.round((dashboardData?.totalRevenue ?? 0) / 1000)}K`}</div>
              <div className="landing-kpi-label">Closed Revenue</div>
            </div>

            <div className="landing-kpi-card glass-panel">
              <div className="landing-kpi-top">
                <div className="landing-kpi-icon-box amber">
                  <TrendingUp size={18} />
                </div>
                <span className="landing-kpi-badge amber">High</span>
              </div>
              <div className="landing-kpi-number">{isLoading ? '...' : `${dashboardData?.winRate ?? 94.2}%`}</div>
              <div className="landing-kpi-label">Conversion Rate</div>
            </div>
          </div>

          {/* Analytics Visual Breakdown Panels */}
          <div className="analytics-breakdown-grid">
            {/* Pipeline Stage Bar Graph */}
            <div className="glass-panel breakdown-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Opportunity Stage Distribution</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>${(dashboardData?.pipelineValue ?? 0).toLocaleString()} Pipeline</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {isLoading ? (
                  <div>Loading pipeline analytics...</div>
                ) : dashboardData?.pipelineStages?.map((stg: any, idx: number) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      <span>{stg.name}</span>
                      <span style={{ color: 'var(--fg-muted)' }}>{stg.count} deals · ${(stg.value || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ width: '100%', height: 10, background: 'var(--bg-alt)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.max(12, stg.count * 20))}%`, background: getStageColor(stg.name), borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Operations Stats */}
            <div className="glass-panel breakdown-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Task Completion Overview</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>{dashboardData?.totalTasks ?? 0} Total Tasks</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-alt)', borderRadius: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Completed Tasks</span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>{dashboardData?.completedTasks ?? 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-alt)', borderRadius: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Pending Tasks</span>
                  <span style={{ fontWeight: 700, color: '#3b82f6' }}>{dashboardData?.pendingTasks ?? 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-alt)', borderRadius: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Overdue Tasks</span>
                  <span style={{ fontWeight: 700, color: '#ef4444' }}>{dashboardData?.overdueTasks ?? 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-alt)', borderRadius: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Average Deal Size</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>${(dashboardData?.averageDealSize ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Accordion Section (#faq) */}
      <section id="faq" style={{ background: 'var(--bg-alt)' }}>
        <div className="section-container">
          <div className="section-header">
            <span className="section-pill">Got Questions?</span>
            <h2>Frequently Asked Questions</h2>
          </div>

          <div className="faq-list">
            {faqs.map((faq, idx) => (
              <div key={idx} className="faq-item">
                <div className="faq-question" onClick={() => toggleFaq(idx)}>
                  <h4>{faq.question}</h4>
                  <ChevronDown size={18} className={`faq-icon ${openFaq === idx ? 'open' : ''}`} />
                </div>
                <div className={`faq-answer ${openFaq === idx ? 'open' : ''}`}>
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Contact Section */}
      <section id="contact" className="landing-contact-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-pill">Get In Touch</span>
            <h2>Contact Sales & Support</h2>
            <p>Have questions about features, pricing, or custom deployment? We are here to help.</p>
          </div>

          <div className="contact-grid">
            {/* Contact Information Card */}
            <div className="glass-panel contact-card">
              <h3 className="contact-card-title">Contact Information</h3>
              <p className="contact-card-subtitle">Reach out directly via email, phone, or our social channels.</p>
              
              <div className="contact-info-list">
                <div className="contact-info-item">
                  <div className="contact-info-icon-wrapper">
                    <Mail size={18} className="contact-icon" />
                  </div>
                  <div className="contact-info-content">
                    <span className="contact-info-label">Email</span>
                    <a href="mailto:abayshemelisshiferaw@gmail.com" className="contact-info-value" title="abayshemelisshiferaw@gmail.com">
                      abayshemelisshiferaw@gmail.com
                    </a>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon-wrapper">
                    <Phone size={18} className="contact-icon" />
                  </div>
                  <div className="contact-info-content">
                    <span className="contact-info-label">Direct Phone</span>
                    <a href="tel:+251909861075" className="contact-info-value">
                      +251 909 861 075
                    </a>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon-wrapper">
                    <MapPin size={18} className="contact-icon" />
                  </div>
                  <div className="contact-info-content">
                    <span className="contact-info-label">Location</span>
                    <span className="contact-info-value">Hawassa, Ethiopia</span>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon-wrapper">
                    <Clock size={18} className="contact-icon" />
                  </div>
                  <div className="contact-info-content">
                    <span className="contact-info-label">Working Hours</span>
                    <span className="contact-info-value">Mon – Fri, 8:30 AM – 5:30 PM (EAT)</span>
                  </div>
                </div>
              </div>

              <div className="contact-social-section">
                <h4 className="connect-heading">Connect With Us</h4>
                <div className="social-links-grid">
                  <a href="https://www.linkedin.com/in/amazi" target="_blank" rel="noopener noreferrer" className="social-btn" title="LinkedIn">
                    <Linkedin size={16} />
                    <span>LinkedIn</span>
                  </a>
                  <a href="https://t.me/Computer_science_2016_bach" target="_blank" rel="noopener noreferrer" className="social-btn" title="Telegram">
                    <Send size={16} />
                    <span>Telegram</span>
                  </a>
                  <a href="https://www.instagram.com/amazi1075" target="_blank" rel="noopener noreferrer" className="social-btn" title="Instagram">
                    <Instagram size={16} />
                    <span>Instagram</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Interactive Contact Form Card */}
            <div className="glass-panel contact-card">
              <h3 className="contact-card-title">Send Us a Message</h3>
              <p className="contact-card-subtitle">Fill out the details below and our team will get back to you promptly.</p>
              
              {formSubmitted ? (
                <div className="form-success">
                  <CheckCircle2 size={48} />
                  <h3>Message Sent Successfully!</h3>
                  <p>Thank you for reaching out. Our team has received your inquiry and will follow up shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="contact-form-layout" noValidate>
                  {submitError && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      borderRadius: '10px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: 500,
                    }}>
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Row 1: Name & Email */}
                  <div className="contact-form-row">
                    <div className="contact-form-field">
                      <label className="contact-field-label">Full Name *</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        className={`input-field contact-input ${formErrors.name ? 'input-error' : ''}`}
                        value={contactForm.name}
                        onChange={e => handleContactFieldChange('name', e.target.value)}
                        style={formErrors.name ? { borderColor: '#ef4444' } : undefined}
                      />
                      {formErrors.name && (
                        <div className="input-error-text" style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#ef4444', fontWeight: 500 }}>
                          <AlertCircle size={13} style={{ flexShrink: 0 }} />
                          <span>{formErrors.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="contact-form-field">
                      <label className="contact-field-label">Email Address *</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        className={`input-field contact-input ${formErrors.email ? 'input-error' : ''}`}
                        value={contactForm.email}
                        onChange={e => handleContactFieldChange('email', e.target.value)}
                        style={formErrors.email ? { borderColor: '#ef4444' } : undefined}
                      />
                      {formErrors.email && (
                        <div className="input-error-text" style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#ef4444', fontWeight: 500 }}>
                          <AlertCircle size={13} style={{ flexShrink: 0 }} />
                          <span>{formErrors.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Phone & Source */}
                  <div className="contact-form-row">
                    <div className="contact-form-field">
                      <PhoneInput
                        label="Phone Number"
                        value={contactForm.phone}
                        onChange={(val) => handleContactFieldChange('phone', val)}
                        defaultCountryCode="ET"
                        showInlineValidation={true}
                        error={formErrors.phone}
                        placeholder="91 123 4567"
                        className="contact-phone-input"
                      />
                    </div>
                    <div className="contact-form-field">
                      <label className="contact-field-label">Lead Source *</label>
                      <SelectDown
                        value={contactForm.source}
                        options={LEAD_SOURCE_OPTIONS}
                        onChange={(val) => handleContactFieldChange('source', String(val))}
                        placeholder="Select Lead Source"
                        className="contact-selectdown"
                      />
                    </div>
                  </div>

                  {/* Row 3: Subject */}
                  <div className="contact-form-field">
                    <label className="contact-field-label">Subject *</label>
                    <input
                      type="text"
                      placeholder="Inquiry regarding CRM features, pricing, or custom setup..."
                      className={`input-field contact-input ${formErrors.subject ? 'input-error' : ''}`}
                      value={contactForm.subject}
                      onChange={e => handleContactFieldChange('subject', e.target.value)}
                      style={formErrors.subject ? { borderColor: '#ef4444' } : undefined}
                    />
                    {formErrors.subject && (
                      <div className="input-error-text" style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#ef4444', fontWeight: 500 }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{formErrors.subject}</span>
                      </div>
                    )}
                  </div>

                  {/* Row 4: Message */}
                  <div className="contact-form-field">
                    <label className="contact-field-label">Message *</label>
                    <textarea
                      placeholder="Please share any specific requirements, team size, or questions you have..."
                      rows={4}
                      className={`input-field contact-textarea ${formErrors.message ? 'input-error' : ''}`}
                      value={contactForm.message}
                      onChange={e => handleContactFieldChange('message', e.target.value)}
                      style={formErrors.message ? { borderColor: '#ef4444' } : undefined}
                    />
                    {formErrors.message && (
                      <div className="input-error-text" style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#ef4444', fontWeight: 500 }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{formErrors.message}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn-primary contact-submit-btn"
                    disabled={isSubmittingContact}
                    style={isSubmittingContact ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
                  >
                    <Send size={16} /> {isSubmittingContact ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Visual Divider Line */}
      <div className="section-divider-band" />

      {/* 8. Footer Section */}
      <footer className="landing-footer-section">
        <div className="section-container footer-grid">
          <div>
            <div className="nav-logo" style={{ marginBottom: '0.75rem' }}>
              <span className="logo-icon">CRM</span>
              <span className="logo-text footer-brand-text">System</span>
            </div>
            <p className="footer-description">
              Enterprise customer relationship management platform designed for sales pipeline execution and team collaboration.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a href="https://www.linkedin.com/in/amazi" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="LinkedIn">
                <Linkedin size={16} />
              </a>
              <a href="https://t.me/Computer_science_2016_bach" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Telegram">
                <Send size={16} />
              </a>
              <a href="https://www.instagram.com/amazi1075" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Instagram">
                <Instagram size={16} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="footer-column-title">System Navigation</h4>
            <div className="footer-links-list">
              <a href="#about" onClick={() => scrollToSection('about')}>About Platform</a>
              <a href="#services" onClick={() => scrollToSection('services')}>CRM Services</a>
              <a href="#features" onClick={() => scrollToSection('features')}>System Features</a>
              <a href="#analytics" onClick={() => scrollToSection('analytics')}>Live Analytics</a>
            </div>
          </div>

          <div>
            <h4 className="footer-column-title">Account Access</h4>
            <div className="footer-links-list">
              <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Login to Account</a>
              <a href="/forgot-password" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }}>Forgot Password</a>
            </div>
          </div>
        </div>

        <div className="footer-copyright-bar">
          © {new Date().getFullYear()} CRM System. All rights reserved.
        </div>
      </footer>

      {/* Landing Page Login Modal */}
      {isLoginModalOpen && (
        <div className="landing-login-modal-overlay" onClick={() => setIsLoginModalOpen(false)}>
          <div className="landing-login-modal-card glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="landing-login-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Building2 size={24} style={{ color: 'var(--accent-primary, #6366f1)' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>CRM Account Sign In</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setIsLoginModalOpen(false)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', marginBottom: '1.25rem', marginTop: '0.25rem' }}>
              Sign in via Google OAuth or Email & Password to access your CRM workspace.
            </p>
            <AuthLoginForm onSuccess={() => setIsLoginModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Floating Public AI Product Assistant for Visitors */}
      {!mobileMenuOpen && <PublicAiAssistant />}
    </div>
  );
};

export default LandingPage;
