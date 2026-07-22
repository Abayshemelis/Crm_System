import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  Menu, X, Moon, Sun, ArrowRight, Users, Building2,
  Target, Calendar, Package, BarChart3, CheckCircle,
  Phone, Mail, MapPin, Clock, Globe, ChevronDown
} from 'lucide-react';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isCursorActive, setIsCursorActive] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const setHeroRef = useCallback((node: HTMLElement | null) => {
    heroRef.current = node;
  }, []);

  useEffect(() => {
    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(shouldUseDark);
    document.documentElement.setAttribute('data-theme', shouldUseDark ? 'dark' : 'light');

    // Redirect if already authenticated
    if (user) {
      navigate('/dashboard');
    }

    // Scroll tracking for navigation frosted glass effect
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [user, navigate]);

  // Separate effect for cursor tracking that depends on heroRef
  useEffect(() => {
    if (!heroRef.current) return;



    const handleMouseMove = (e: MouseEvent) => {
      const rect = heroRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCursorPosition({ x, y });
      setIsCursorActive(true);
    };

    const handleMouseLeave = () => {
      setIsCursorActive(false);
    };

    const handleMouseEnter = () => {
      setIsCursorActive(true);
    };

    heroRef.current.addEventListener('mousemove', handleMouseMove);
    heroRef.current.addEventListener('mouseleave', handleMouseLeave);
    heroRef.current.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      if (heroRef.current) {
        heroRef.current.removeEventListener('mousemove', handleMouseMove);
        heroRef.current.removeEventListener('mouseleave', handleMouseLeave);
        heroRef.current.removeEventListener('mouseenter', handleMouseEnter);
      }
    };
  }, [heroRef]);

  // Stats animation effect
  useEffect(() => {
    const animateStats = () => {
      const statNumbers = document.querySelectorAll('.stat-number[data-target]');

      statNumbers.forEach((stat) => {
        const target = parseInt(stat.getAttribute('data-target') || '0');
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;

        const updateNumber = () => {
          current += step;
          if (current < target) {
            stat.textContent = Math.floor(current).toString();
            requestAnimationFrame(updateNumber);
          } else {
            stat.textContent = target.toString();
          }
        };

        updateNumber();
      });
    };

    // Use Intersection Observer to trigger animation when stats section is visible
    const statsSection = document.getElementById('stats');
    if (statsSection) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateStats();
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      observer.observe(statsSection);
    }

    // Fade-in animation for elements
    const fadeElements = document.querySelectorAll('.fade-in');
    const fadeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            fadeObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    fadeElements.forEach((el) => fadeObserver.observe(el));
  }, [dashboardData]);

  // Fetch public dashboard stats
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const data = await api.get('/api/dashboard/public-stats');
        console.log('dashboard public-stats', data);
        setDashboardData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
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
    if (!stageName) return '#6b7280';
    return colors[stageName.toLowerCase()] || '#6b7280';
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate form
    if (!contactForm.name || !contactForm.email || !contactForm.subject || !contactForm.message) {
      return;
    }
    // Simulate form submission
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setContactForm({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  const features = [
    {
      icon: Users,
      title: 'Customer Management',
      description: 'Manage customer profiles, contact information, and customer history in one place'
    },
    {
      icon: Building2,
      title: 'Company Management',
      description: 'Organize companies, assign customers, and track company relationships'
    },
    {
      icon: Target,
      title: 'Lead Management',
      description: 'Capture and qualify leads, track lead sources, and convert leads to customers'
    },
    {
      icon: Target,
      title: 'Opportunities & Pipeline',
      description: 'Track sales opportunities, manage pipeline stages, and forecast revenue'
    },
    {
      icon: Calendar,
      title: 'Task Management',
      description: 'Create tasks, set due dates, assign to team members, and track progress'
    },
    {
      icon: Package,
      title: 'Product Management',
      description: 'Manage your product catalog, track inventory, and associate products with opportunities'
    },
    {
      icon: BarChart3,
      title: 'Dashboard & Analytics',
      description: 'View real-time dashboards, track KPIs, and generate insightful reports'
    },
    {
      icon: CheckCircle,
      title: 'Audit Logs',
      description: 'Track all system activities with comprehensive audit trails and logs'
    }
  ];

  const benefits = [
    { icon: CheckCircle, title: 'All-in-One Solution', description: 'Manage customers, leads, opportunities, and tasks in a single system' },
    { icon: Users, title: 'Team Collaboration', description: 'Assign tasks and opportunities to team members with role-based access' },
    { icon: Target, title: 'Sales Pipeline', description: 'Track deals through customizable stages from lead to close' },
    { icon: BarChart3, title: 'Real-Time Analytics', description: 'Get insights with live dashboards and comprehensive reporting' },
    { icon: Calendar, title: 'Task Automation', description: 'Automate follow-ups and reminders to never miss a deadline' },
    { icon: Globe, title: 'Global Access', description: 'Access your CRM from anywhere with cloud-based infrastructure' }
  ];

  return (
    <div className={`landing-page ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Navigation */}
      <nav className={`landing-nav ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">CRM</span>
            <span className="logo-text">System</span>
          </div>

          <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <a href="#home" onClick={() => scrollToSection('home')}>Home</a>
            <a href="#about" onClick={() => scrollToSection('about')}>About</a>
            <a href="#services" onClick={() => scrollToSection('services')}>Services</a>
            <a href="#features" onClick={() => scrollToSection('features')}>Features</a>
            <a href="#contact" onClick={() => scrollToSection('contact')}>Contact</a>
          </div>

          <div className="nav-actions">
            <button className="theme-toggle" onClick={toggleTheme}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="btn-secondary" onClick={() => navigate('/login')}>
              Login
            </button>
            <button className="btn-primary" onClick={() => navigate('/login')}>
              Get Started
            </button>
            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero-section" ref={setHeroRef}>
        {/* Dot Grid Background */}
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
            <span className="hero-eyebrow">Customer relationship management for modern teams</span>
            <h1>Manage <span className="gradient-text">Customers, Leads & Sales</span> in One Powerful CRM</h1>
            <p>Unify customer records, leads, opportunities, and follow-up tasks in a single workspace so your team can move faster and serve clients with confidence.</p>
            <div className="hero-buttons">
              <button className="btn-primary" onClick={() => scrollToSection('features')}>
                Get Started Free <ArrowRight size={16} />
              </button>
              <button className="btn-secondary" onClick={() => scrollToSection('about')}>
                Learn More
              </button>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="stat-number">7+</div>
                <div className="stat-label">Active Users</div>
              </div>
              <div className="hero-stat">
                <div className="stat-number">$3756+</div>
                <div className="stat-label">Revenue Tracked</div>
              </div>
              <div className="hero-stat">
                <div className="stat-number">99.9%</div>
                <div className="stat-label">Uptime</div>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div className="preview-body">
                {/* Top Section - KPI Cards */}
                <div className="preview-kpi-grid">
                  <div className="preview-kpi-card">
                    <Users size={16} className="kpi-icon" />
                    <div className="kpi-value">{isLoading ? '...' : dashboardData?.totalCustomers || 0}</div>
                    <div className="kpi-label">Total Customers</div>
                  </div>
                  <div className="preview-kpi-card">
                    <Target size={16} className="kpi-icon" />
                    <div className="kpi-value">{isLoading ? '...' : dashboardData?.totalLeads || 0}</div>
                    <div className="kpi-label">Total Leads</div>
                  </div>
                  <div className="preview-kpi-card">
                    <CheckCircle size={16} className="kpi-icon" />
                    <div className="kpi-value">{isLoading ? '...' : dashboardData?.dealsClosed || 0}</div>
                    <div className="kpi-label">Deals Closed</div>
                  </div>
                  <div className="preview-kpi-card">
                    <BarChart3 size={16} className="kpi-icon" />
                    <div className="kpi-value">{isLoading ? '...' : `$${Math.round((dashboardData?.totalRevenue || 0) / 1000)}K`}</div>
                    <div className="kpi-label">Total Revenue</div>
                  </div>
                </div>

                {/* Middle Section */}
                <div className="preview-middle-section">
                  {/* Left Column - Revenue Pipeline Chart */}
                  <div className="preview-chart-section">
                    <div className="chart-header">
                      <h4>Revenue Pipeline</h4>
                      <div className="chart-summary">$45K Total</div>
                    </div>
                    <div className="bar-chart">
                      <div className="bar" style={{ height: '60%' }}></div>
                      <div className="bar" style={{ height: '80%' }}></div>
                      <div className="bar" style={{ height: '45%' }}></div>
                      <div className="bar" style={{ height: '90%' }}></div>
                      <div className="bar" style={{ height: '70%' }}></div>
                      <div className="bar" style={{ height: '55%' }}></div>
                    </div>
                    <div className="chart-labels">
                      <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                    </div>
                  </div>

                  {/* Right Column - Recent Leads */}
                  <div className="preview-leads-section">
                    <h4>Recent Leads</h4>
                    <div className="leads-list">
                      {isLoading ? (
                        <div className="lead-item">Loading...</div>
                      ) : dashboardData?.recentLeads?.length > 0 ? (
                        dashboardData.recentLeads.map((lead: any, index: number) => {
                          const date = lead.date ? new Date(lead.date) : null;
                          const formattedDate = date && !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Invalid date';
                          return (
                            <div key={index} className="lead-item">
                              <div className="lead-info">
                                <div className="lead-name">{lead.name}</div>
                                <div className="lead-company">{lead.name}</div>
                              </div>
                              <div className={`lead-status ${(lead.status || 'new').toLowerCase().replace(' ', '-')}`}>
                                {lead.status || 'New'}
                              </div>
                              <div className="lead-date">{formattedDate}</div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="lead-item">No recent leads</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Section - Pipeline Stages */}
                <div className="preview-pipeline-stages">
                  {isLoading ? (
                    <div className="pipeline-stage">Loading...</div>
                  ) : dashboardData?.pipelineStages?.length > 0 ? (
                    dashboardData.pipelineStages.map((stage: any, index: number) => {
                      const stageName = (stage.name || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
                      return (
                        <div key={index} className={`pipeline-stage ${stageName}`} style={{
                          background: getStageColor(stage.name)
                        }}>
                          <div className="stage-count">{stage.count}</div>
                          <div className="stage-name">{stage.name || 'Unknown'}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="pipeline-stage">No stages</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-pill">About</span>
            <h2>About CRM System</h2>
            <p>Our CRM is designed to help businesses of all sizes manage their customer relationships, streamline sales processes, and drive growth.</p>
          </div>
          <div className="target-users">
            <div className="user-card fade-in">
              <Users size={32} />
              <h3>Sales Teams</h3>
              <p>Close more deals with structured pipelines and real-time insights.</p>
            </div>
            <div className="user-card fade-in">
              <Target size={32} />
              <h3>Startups</h3>
              <p>Scale from first customer to enterprise without switching tools.</p>
            </div>
            <div className="user-card fade-in">
              <Building2 size={32} />
              <h3>SMEs</h3>
              <p>Manage every relationship and opportunity across your company.</p>
            </div>
            <div className="user-card fade-in">
              <Globe size={32} />
              <h3>Enterprises</h3>
              <p>Role-based access, audit trails, and multi-company management.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-pill">Features</span>
            <h2>Powerful Features</h2>
            <p>Everything you need to manage your customer relationships and grow your business</p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  <feature.icon size={32} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="services-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-pill">Services</span>
            <h2>Our Services</h2>
            <p>Comprehensive CRM solutions tailored to your business needs</p>
          </div>
          <div className="services-list">
            <div className="service-item">
              <CheckCircle size={20} className="service-icon" />
              <span>CRM Setup & Implementation</span>
            </div>
            <div className="service-item">
              <CheckCircle size={20} className="service-icon" />
              <span>Business Process Management</span>
            </div>
            <div className="service-item">
              <CheckCircle size={20} className="service-icon" />
              <span>Sales Pipeline Optimization</span>
            </div>
            <div className="service-item">
              <CheckCircle size={20} className="service-icon" />
              <span>Customer Relationship Management</span>
            </div>
            <div className="service-item">
              <CheckCircle size={20} className="service-icon" />
              <span>Reporting & Analytics</span>
            </div>
            <div className="service-item">
              <CheckCircle size={20} className="service-icon" />
              <span>Workflow Automation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="benefits-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-pill">Benefits</span>
            <h2>Why Choose Our CRM?</h2>
            <p>Benefits that drive your business forward</p>
          </div>
          <div className="benefits-grid">
            {benefits.map((benefit, index) => (
              <div key={index} className="benefit-card">
                <div className="benefit-icon">
                  <benefit.icon size={28} />
                </div>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-pill">Process</span>
            <h2>How It Works</h2>
            <p>Get started with CRM System in 4 simple steps</p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Create a Lead</h3>
              <p>Capture leads from any source — forms, email, or manual entry.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Convert the Lead</h3>
              <p>Qualify and convert to a customer or opportunity with one click</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Manage Opporunity</h3>
              <p>Move deals through pipeline stages and track every interaction.</p>
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <h3>Close the Deal</h3>
              <p>Track performance, close deals, and scale your business</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="stats-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-pill">Statistics</span>
            <h2>Real-Time Metrics</h2>
            <p>Live data from your CRM system</p>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number" data-target={isLoading ? 0 : dashboardData?.totalCustomers || 0}>0</div>
              <div className="stat-label">Customers Managed</div>
            </div>
            <div className="stat-item">
              <div className="stat-number" data-target={isLoading ? 0 : dashboardData?.totalLeads || 0}>0</div>
              <div className="stat-label">Leads Converted</div>
            </div>
            <div className="stat-item">
              <div className="stat-number" data-target="850">0</div>
              <div className="stat-label">Tasks Completed</div>
            </div>
            <div className="stat-item">
              <div className="stat-number" data-target="75">0</div>
              <div className="stat-label">Companies</div>
            </div>
            <div className="stat-item">
              <div className="stat-number" data-target={isLoading ? 0 : dashboardData?.dealsClosed || 0}>0</div>
              <div className="stat-label">Deals Closed</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-pill">FAQ</span>
            <h2>Frequently Asked Questions</h2>
            <p>Find answers to common questions about CRM System</p>
          </div>
          <div className="faq-list">
            {[
              {
                question: 'What is CRM System?',
                answer: 'CRM System is a comprehensive customer relationship management platform that helps businesses manage customers, leads, opportunities, and sales pipelines in one unified platform.'
              },
              {
                question: 'Is CRM System suitable for small businesses?',
                answer: 'Yes! CRM System is designed for businesses of all sizes, from startups to enterprises. Our flexible pricing and features can scale with your business.'
              },
              {
                question: 'Can I import my existing customer data?',
                answer: 'Yes, CRM System supports importing customer data from various formats including CSV, Excel, and other CRM systems. Our team can assist with data migration.'
              },
              {
                question: 'What kind of support do you offer?',
                answer: 'We offer 24/7 customer support via email, phone, and live chat. Premium plans include dedicated account managers and priority support.'
              },
              {
                question: 'Is my data secure?',
                answer: 'Absolutely. We use enterprise-grade encryption, regular security audits, and comply with major data protection regulations including GDPR and CCPA.'
              }
            ].map((faq, index) => (
              <div key={index} className="faq-item">
                <div className="faq-question" onClick={() => toggleFaq(index)}>
                  <h4>{faq.question}</h4>
                  <ChevronDown size={20} className={`faq-icon ${openFaq === index ? 'open' : ''}`} />
                </div>
                <div className={`faq-answer ${openFaq === index ? 'open' : ''}`}>
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-pill">Contact</span>
            <h2>Contact Us</h2>
            <p>Get in touch with our team</p>
          </div>
          <div className="contact-grid">
            <div className="contact-info">
              <div className="contact-item">
                <Mail size={24} />
                <div>
                  <h4>Email</h4>
                  <p>abayshemelisshiferaw@gmail.com</p>
                  <p>unique861075@gmail.com</p>
                </div>
              </div>
              <div className="contact-item">
                <Phone size={24} />
                <div>
                  <h4>Phone</h4>
                  <p>+251909861075</p>
                </div>
              </div>
              <div className="contact-item">
                <MapPin size={24} />
                <div>
                  <h4>Office Address</h4>
                  <p>Hawassa, sidama<br />Hawassa Techno Cumpas</p>
                </div>
              </div>
              <div className="contact-item">
                <Clock size={24} />
                <div>
                  <h4>Business Hours</h4>
                  <p>Monday - Friday: 2AM - 6PM PST</p>
                </div>
              </div>
            </div>
            <div className="contact-form">
              {formSubmitted ? (
                <div className="form-success">
                  <CheckCircle size={48} />
                  <h3>Message Sent!</h3>
                  <p>Thank you for reaching out. We'll get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit}>
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Subject</label>
                    <input
                      type="text"
                      placeholder="Subject"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Message</label>
                    <textarea
                      placeholder="Your message"
                      rows={5}
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn-primary">
                    Send Message <ArrowRight size={16} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-section">
            <div className="footer-logo">
              <span className="logo-icon">CRM</span>
              <span className="logo-text">System</span>
            </div>
            <p>Comprehensive CRM solution for modern businesses.</p>
            <div className="social-icons">
              <a href="#" className="social-icon"><Globe size={20} /></a>
              <a href="#" className="social-icon"><Mail size={20} /></a>
              <a href="#" className="social-icon"><Phone size={20} /></a>
            </div>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <a href="#home" onClick={() => scrollToSection('home')}>Home</a>
            <a href="#about" onClick={() => scrollToSection('about')}>About</a>
            <a href="#services" onClick={() => scrollToSection('services')}>Services</a>
            <a href="#features" onClick={() => scrollToSection('features')}>Features</a>
            <a href="#contact" onClick={() => scrollToSection('contact')}>Contact</a>
          </div>
          <div className="footer-section">
            <h4>Features</h4>
            <a onClick={() => navigate('/login')}>Customers</a>
            <a onClick={() => navigate('/login')}>Companies</a>
            <a onClick={() => navigate('/login')}>Leads</a>
            <a onClick={() => navigate('/login')}>Opportunities</a>
            <a onClick={() => navigate('/login')}>Tasks</a>
            <a onClick={() => navigate('/login')}>Products</a>
          </div>
          <div className="footer-section">
            <h4>Newsletter</h4>
            <p>Subscribe for updates and tips</p>
            <div className="newsletter-form">
              <input type="email" placeholder="Enter your email" />
              <button type="button" className="btn-primary">Subscribe</button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 CRM System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
