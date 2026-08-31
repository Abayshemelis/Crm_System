import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DatePicker } from '../components/ui/DatePicker';
import { SelectDown } from '../components/ui/SelectDown';
import { AuditHistoryTable } from '../components/audit/AuditHistoryTable';
import { TimelineList } from '../components/activities/TimelineList';
import { TaskListGroup, TaskReadDto } from '../components/tasks/TaskListGroup';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { QuoteModal } from '../components/opportunities/QuoteModal';
import { ContractModal, ContractItem } from '../components/contracts/ContractModal';
import { EmailComposerModal } from '../components/email/EmailComposerModal';
import { showToast } from '../lib/toast';
import { ArrowLeft, Mail, Phone, Building2, Tag, X, Plus, History, Check, XCircle, Trash2, Calendar, FileText, User, RefreshCw, Send, Package, ShoppingBag, CheckCircle2, AlertTriangle, FileSignature, Receipt, Eye, Link as LinkIcon, ExternalLink, Pencil, DollarSign, CreditCard, Clock, Copy, ShieldCheck } from 'lucide-react';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Skeleton } from '../components/ui/Skeleton';
import Attachments from '../components/attachments/Attachments';
import { AiOpportunityAssistant } from '../components/ai/AiOpportunityAssistant';
import { getExpectedCloseDateStatus, getStandardCloseDatePresets, formatDisplayDate, getLocalDateString } from '../lib/dateUtils';
import { useSystemProfile, useFormatCurrency } from '../context/SystemProfileContext';
import './screens.css';
import { confirmAction } from '../lib/confirm';

interface Opportunity {
  opportunityId: number;
  customerId: number;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone?: string;
  title: string;
  opportunityStageId: number;
  stageName?: string;
  estimatedValue: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  ownerId: number;
  ownerName?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Stage {
  opportunityStageId: number;
  name: string;
  isWon: boolean;
  isLost: boolean;
}

interface UserLookup {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface OpportunityLineItem {
  lineItemId: number;
  opportunityId: number;
  productId: number;
  product?: {
    name: string;
    sku?: string;
    productCategory?: { name: string };
  };
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  totalPrice: number;
}

interface Product {
  productId: number;
  name: string;
  sku?: string;
  productCategory?: { name: string };
  productStatus?: { isSelectable: boolean };
  price: number;
}

type TabId = 'details' | 'lineItems' | 'contracts' | 'activities' | 'tasks' | 'attachments' | 'audit';

export const OpportunityDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { profile } = useSystemProfile();
  const { formatCurrency, currency } = useFormatCurrency();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [lineItems, setLineItems] = useState<OpportunityLineItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [users, setUsers] = useState<UserLookup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingPrices, setSyncingPrices] = useState(false);

  // Contracts & Invoices states
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedContractForModal, setSelectedContractForModal] = useState<ContractItem | null>(null);
  const [showCreateContractModal, setShowCreateContractModal] = useState(false);
  const [newContractTitle, setNewContractTitle] = useState('');
  const [newContractValue, setNewContractValue] = useState(0);
  const [newContractTerms, setNewContractTerms] = useState('Standard commercial terms apply. Payment Net 30 days.');
  const [creatingContract, setCreatingContract] = useState(false);

  // Contract Edit State
  const [editingContract, setEditingContract] = useState<ContractItem | null>(null);
  const [editContractTitle, setEditContractTitle] = useState('');
  const [editContractValue, setEditContractValue] = useState(0);
  const [editContractStatus, setEditContractStatus] = useState('Draft');
  const [editContractStartDate, setEditContractStartDate] = useState('');
  const [editContractEndDate, setEditContractEndDate] = useState('');
  const [editContractTerms, setEditContractTerms] = useState('');
  const [editContractNotes, setEditContractNotes] = useState('');
  const [savingContract, setSavingContract] = useState(false);

  // Invoice Create Modal State
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [newInvoiceAmount, setNewInvoiceAmount] = useState(0);
  const [newInvoiceTaxRate, setNewInvoiceTaxRate] = useState(0);
  const [newInvoiceContractId, setNewInvoiceContractId] = useState<number | null>(null);
  const [newInvoiceIssueDate, setNewInvoiceIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newInvoiceDueDate, setNewInvoiceDueDate] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [newInvoiceNotes, setNewInvoiceNotes] = useState('');
  const [newInvoiceTerms, setNewInvoiceTerms] = useState('Payment due within 30 days of issue date.');
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [syncingContractId, setSyncingContractId] = useState<number | null>(null);
  const [syncingInvoiceId, setSyncingInvoiceId] = useState<number | null>(null);

  // Invoice Edit Modal State
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [editInvoiceAmount, setEditInvoiceAmount] = useState(0);
  const [editInvoiceTaxRate, setEditInvoiceTaxRate] = useState(0);
  const [editInvoiceStatus, setEditInvoiceStatus] = useState('Draft');
  const [editInvoiceIssueDate, setEditInvoiceIssueDate] = useState('');
  const [editInvoiceDueDate, setEditInvoiceDueDate] = useState('');
  const [editInvoicePaymentMethod, setEditInvoicePaymentMethod] = useState('');
  const [editInvoiceNotes, setEditInvoiceNotes] = useState('');
  const [editInvoiceTerms, setEditInvoiceTerms] = useState('');
  const [savingInvoice, setSavingInvoice] = useState(false);

  // Invoice Pay Modal State
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState<string>(() => getLocalDateString(new Date()));
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentBankName, setPaymentBankName] = useState('Commercial Bank of Ethiopia (Nigd Bank)');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Phase 4 states
  const [activities, setActivities] = useState<any[]>([]);
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<TaskReadDto[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<any[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState<TaskReadDto | null>(null);
  const [allActivities, setAllActivities] = useState<any[]>([]);

  const [editedOpportunity, setEditedOpportunity] = useState<Partial<Opportunity>>({});
  const [newLineItem, setNewLineItem] = useState({
    productId: 0,
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0
  });

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [auditRefreshTrigger, setAuditRefreshTrigger] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [oppData, lineItemsData, productsData, stagesData, usersData, actTypes, taskStats, contractsData, invoicesData] = await Promise.all([
        api.get<Opportunity>(`/api/opportunities/${id}`),
        api.get<OpportunityLineItem[]>(`/api/opportunitylineitems/${id}`).catch(() => []),
        api.get<Product[]>('/api/products').catch(() => []),
        api.get<Stage[]>('/api/opportunitystages').catch(() => []),
        api.get<UserLookup[]>('/api/users').catch(() => []),
        api.get<any[]>('/api/activitytypes').catch(() => []),
        api.get<any[]>('/api/taskstatuses').catch(() => []),
        api.get<ContractItem[]>(`/api/contracts?opportunityId=${id}`).catch(() => []),
        api.get<any[]>(`/api/invoices?opportunityId=${id}`).catch(() => [])
      ]);
      setOpportunity(oppData);
      setEditedOpportunity(oppData);
      setLineItems(lineItemsData || []);
      setProducts((productsData || []).filter(p => p.productStatus?.isSelectable));
      setStages(stagesData || []);
      setUsers(usersData || []);
      setContracts(Array.isArray(contractsData) ? contractsData : []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setActivityTypes((actTypes || []).map(x => ({ id: x.id ?? x.Id, name: x.name ?? x.Name, icon: x.icon ?? x.Icon })));
      setTaskStatuses((taskStats || []).map(x => ({ id: x.id, name: x.name, isTerminal: x.isTerminal })));

      // Load activities & tasks
      const [activitiesData, tasksData, allActivitiesData] = await Promise.all([
        api.get<any[]>(`/api/activities?opportunityId=${id}`).catch(() => []),
        api.get<TaskReadDto[]>(`/api/tasks?opportunityId=${id}`).catch(() => []),
        api.get<any[]>('/api/activities').catch(() => [])
      ]);
      setActivities(activitiesData || []);
      setTasks(tasksData || []);
      setAllActivities(allActivitiesData || []);
    } catch (error) {
      console.error('Failed to load opportunity details:', error);
      navigate('/pipeline');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const lineItemsTotal = useMemo(() => {
    return lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100)), 0);
  }, [lineItems]);

  const currentQuotedTotal = lineItems.length > 0 ? lineItemsTotal : (opportunity?.estimatedValue || 0);

  const hasOutdatedCatalogPrices = useMemo(() => {
    return lineItems.some(item => {
      const catalog = products.find(p => p.productId === item.productId);
      return catalog && Math.abs(catalog.price - item.unitPrice) > 0.001;
    });
  }, [lineItems, products]);

  const handleFieldChange = (field: keyof Opportunity, value: any) => {
    setEditedOpportunity(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!id || !opportunity) return;
    setSaving(true);
    try {
      await api.put(`/api/opportunities/${id}`, {
        title: editedOpportunity.title,
        description: editedOpportunity.description,
        opportunityStageId: editedOpportunity.opportunityStageId,
        estimatedValue: editedOpportunity.estimatedValue,
        expectedCloseDate: editedOpportunity.expectedCloseDate,
        actualCloseDate: editedOpportunity.actualCloseDate,
        ownerId: editedOpportunity.ownerId,
      });
      await loadData();
      setAuditRefreshTrigger(t => t + 1);
      triggerToast('Opportunity updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update opportunity:', error);
      triggerToast('Failed to update opportunity', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsWon = async () => {
    if (!id || !opportunity) return;
    const wonStage = stages.find(s => s.isWon);
    if (!wonStage) return;
    try {
      await api.patch(`/api/opportunities/${id}/stage`, { stageId: wonStage.opportunityStageId });
      await loadData();
      setAuditRefreshTrigger(t => t + 1);
      triggerToast('Opportunity marked as Won 🎉', 'success');
      if (contracts.length === 0) {
        if (await confirmAction('Deal marked as Won 🎉! Would you like to create the commercial Contract for this deal now?')) {
          handleOpenCreateContract();
        }
      } else {
        showToast(`Deal marked as Won 🎉! Existing contract (${contracts[0].contractNumber}) is attached.`);
      }
    } catch (error) {
      console.error('Failed to mark as won:', error);
      triggerToast('Failed to update stage', 'error');
    }
  };

  const handleOpenCreateContract = () => {
    if (!opportunity) return;
    if (contracts.length > 0) {
      // Reuse existing contract instead of creating duplicate
      const existing = contracts[0];
      setSelectedContractForModal(existing);
      showToast(`Existing contract found (${existing.contractNumber}). Reusing existing contract.`);
      setActiveTab('contracts');
      return;
    }
    const defaultValue = currentQuotedTotal > 0 ? currentQuotedTotal : opportunity.estimatedValue;
    setNewContractTitle(`Service Agreement: ${opportunity.title}`);
    setNewContractValue(defaultValue);
    setShowCreateContractModal(true);
  };

  const handleCreateContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opportunity || !id) return;
    if (!newContractTitle.trim()) {
      showToast('Please enter a contract title', 'error');
      return;
    }
    setCreatingContract(true);
    try {
      const res = await api.post<ContractItem>('/api/contracts', {
        customerId: opportunity.customerId,
        opportunityId: Number(id),
        title: newContractTitle.trim(),
        contractValue: newContractValue,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        termsAndConditions: newContractTerms
      });
      showToast(contracts.length > 0 ? `Existing contract (${contracts[0].contractNumber}) updated successfully!` : 'Contract created successfully! Ready for e-signature.');
      setShowCreateContractModal(false);
      await loadData();
      setActiveTab('contracts');
      if (res && res.contractId) {
        setSelectedContractForModal(res);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create contract', 'error');
    } finally {
      setCreatingContract(false);
    }
  };

  // --- CONTRACT CRUD HANDLERS ---
  const handleSyncContractPricing = async (contractId: number) => {
    setSyncingContractId(contractId);
    try {
      await api.post(`/api/contracts/${contractId}/sync-pricing`, {});
      showToast('Contract value synchronized with latest quote & product catalog prices!');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to sync contract pricing', 'error');
    } finally {
      setSyncingContractId(null);
    }
  };

  const handleOpenEditContract = (c: ContractItem) => {
    setEditingContract(c);
    setEditContractTitle(c.title || '');
    setEditContractValue(c.contractValue || 0);
    setEditContractStatus(c.status || 'Draft');
    setEditContractStartDate(c.startDate ? c.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditContractEndDate(c.endDate ? c.endDate.slice(0, 10) : new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10));
    setEditContractTerms(c.termsAndConditions || 'Standard commercial terms apply. Payment Net 30 days.');
    setEditContractNotes(c.notes || '');
  };

  const handleEditContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract) return;
    if (!editContractTitle.trim()) {
      showToast('Please enter a contract title', 'error');
      return;
    }
    setSavingContract(true);
    try {
      await api.put(`/api/contracts/${editingContract.contractId}`, {
        title: editContractTitle.trim(),
        contractValue: editContractValue,
        startDate: new Date(editContractStartDate).toISOString(),
        endDate: new Date(editContractEndDate).toISOString(),
        status: editContractStatus,
        termsAndConditions: editContractTerms || null,
        notes: editContractNotes || null,
        opportunityId: Number(id),
      });
      showToast('Contract updated successfully!');
      setEditingContract(null);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update contract', 'error');
    } finally {
      setSavingContract(false);
    }
  };

  const handleDeleteContract = async (c: ContractItem) => {
    if (!await confirmAction(`Are you sure you want to delete contract ${c.contractNumber} (${c.title})? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/api/contracts/${c.contractId}`);
      showToast(`Contract ${c.contractNumber} deleted successfully`);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete contract', 'error');
    }
  };

  // --- INVOICE CRUD HANDLERS ---
  const handleSyncInvoicePricing = async (invoiceId: number) => {
    setSyncingInvoiceId(invoiceId);
    try {
      await api.post(`/api/invoices/${invoiceId}/sync-pricing`, {});
      showToast('Invoice amount synchronized with latest quote & product catalog prices!');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to sync invoice pricing', 'error');
    } finally {
      setSyncingInvoiceId(null);
    }
  };

  const handleOpenCreateInvoice = (contract?: ContractItem) => {
    const defaultAmt = contract?.contractValue ?? (currentQuotedTotal > 0 ? currentQuotedTotal : opportunity?.estimatedValue ?? 0);
    setNewInvoiceAmount(defaultAmt);
    setNewInvoiceTaxRate(0);
    setNewInvoiceContractId(contract?.contractId ?? (contracts.length > 0 ? contracts[0].contractId : null));
    setNewInvoiceIssueDate(new Date().toISOString().slice(0, 10));
    setNewInvoiceDueDate(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
    setNewInvoiceNotes(`Billing invoice for deal: ${opportunity?.title || ''}`);
    setNewInvoiceTerms('Payment due within 30 days of issue date.');
    setShowCreateInvoiceModal(true);
  };

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opportunity || !id) return;
    if (newInvoiceAmount <= 0) {
      showToast('Invoice amount must be greater than $0', 'error');
      return;
    }
    setCreatingInvoice(true);
    try {
      const res = await api.post<any>('/api/invoices', {
        customerId: opportunity.customerId,
        opportunityId: Number(id),
        contractId: newInvoiceContractId || null,
        amount: newInvoiceAmount,
        taxRate: newInvoiceTaxRate,
        issueDate: new Date(newInvoiceIssueDate).toISOString(),
        dueDate: new Date(newInvoiceDueDate).toISOString(),
        notes: newInvoiceNotes || null,
        terms: newInvoiceTerms || null,
      });
      if (res?.invoiceNumber) {
        showToast(`Invoice #${res.invoiceNumber} ready!`);
      } else {
        showToast('Invoice saved & linked to deal!');
      }
      setShowCreateInvoiceModal(false);
      await loadData();
      setActiveTab('contracts');
    } catch (err: any) {
      showToast(err?.message || 'Failed to create invoice', 'error');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleOpenEditInvoice = (inv: any) => {
    setEditingInvoice(inv);
    setEditInvoiceAmount(inv.amount || 0);
    setEditInvoiceTaxRate(inv.taxRate || 0);
    setEditInvoiceStatus(inv.status || 'Draft');
    setEditInvoiceIssueDate(inv.issueDate ? inv.issueDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditInvoiceDueDate(inv.dueDate ? inv.dueDate.slice(0, 10) : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
    setEditInvoicePaymentMethod(inv.paymentMethod || '');
    setEditInvoiceNotes(inv.notes || '');
    setEditInvoiceTerms(inv.terms || 'Payment due within 30 days of issue date.');
  };

  const handleEditInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    if (editInvoiceAmount <= 0) {
      showToast('Invoice amount must be greater than $0', 'error');
      return;
    }
    setSavingInvoice(true);
    try {
      await api.put(`/api/invoices/${editingInvoice.invoiceId}`, {
        amount: editInvoiceAmount,
        taxRate: editInvoiceTaxRate,
        status: editInvoiceStatus,
        issueDate: new Date(editInvoiceIssueDate).toISOString(),
        dueDate: new Date(editInvoiceDueDate).toISOString(),
        paymentMethod: editInvoicePaymentMethod || null,
        notes: editInvoiceNotes || null,
        terms: editInvoiceTerms || null,
      });
      showToast('Invoice updated successfully!');
      setEditingInvoice(null);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update invoice', 'error');
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleOpenPayInvoice = (inv: any) => {
    setPayingInvoice(inv);
    const balance = inv.balanceDue ?? (inv.status === 'Paid' ? 0 : (inv.totalAmount || inv.amount));
    setPaymentAmount(balance > 0 ? balance : (inv.totalAmount || inv.amount));
    setPaymentDate(getLocalDateString(new Date()));
    setPaymentMethod('Bank Transfer');
    setPaymentBankName('Commercial Bank of Ethiopia (Nigd Bank)');
    setPaymentRef('');
    setPaymentNotes('');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    if (paymentAmount <= 0) {
      showToast('Payment amount must be greater than zero', 'error');
      return;
    }
    setProcessingPayment(true);
    try {
      const showBank = paymentMethod === 'Bank Transfer' || paymentMethod === 'Check' || paymentMethod === 'SWIFT Wire Transfer';
      const res = await api.post<any>(`/api/invoices/${payingInvoice.invoiceId}/pay`, {
        amount: paymentAmount,
        paymentMethod,
        bankName: showBank ? paymentBankName : undefined,
        paymentDate: paymentDate || undefined,
        transactionReference: paymentRef.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });
      showToast(res.message || 'Payment recorded & verified into Company account!', 'success');
      setPayingInvoice(null);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to record payment', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSendPaymentRequest = async (inv: any) => {
    try {
      const res = await api.post<any>(`/api/invoices/${inv.invoiceId}/send-payment-request`, {});
      showToast(res.message || `Payment request link sent to customer!`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to send payment request', 'error');
    }
  };

  const handleCopyPaymentLink = (inv: any) => {
    const origin = window.location.origin;
    const url = `${origin}/invoices/pay/${inv.invoiceNumber}`;
    navigator.clipboard.writeText(url);
    showToast(`Payment portal link copied: ${url}`, 'success');
  };

  const handleSyncStripe = async (inv: any) => {
    try {
      showToast('Checking Stripe for payment...', 'info');
      const res = await api.post<{ message: string; status: string }>(`/api/invoices/${inv.invoiceId}/sync-stripe`, {});
      showToast(res.message);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to sync with Stripe', 'error');
    }
  };

  const handleDeleteInvoice = async (inv: any) => {
    if (!await confirmAction(`Are you sure you want to delete invoice ${inv.invoiceNumber}? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/api/invoices/${inv.invoiceId}`);
      showToast(`Invoice ${inv.invoiceNumber} deleted`);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete invoice', 'error');
    }
  };

  const handleGenerateInvoiceFromContract = async (contract: ContractItem) => {
    handleOpenCreateInvoice(contract);
  };

  const [sendingContractEmailId, setSendingContractEmailId] = useState<number | null>(null);

  const handleEmailContract = async (contract: ContractItem) => {
    let targetEmail = contract.customerEmail || opportunity?.customerEmail;
    if (!targetEmail || !targetEmail.trim()) {
      const input = window.prompt('Please enter the customer email address to send the contract to:');
      if (!input || !input.trim()) return;
      targetEmail = input.trim();
    }

    setSendingContractEmailId(contract.contractId);
    try {
      const res = await api.post<{ message?: string }>(`/api/contracts/${contract.contractId}/send-email`, {
        recipientEmail: targetEmail
      });
      showToast(res.message || `Signing link emailed to ${targetEmail}!`);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to email signing link', 'error');
    } finally {
      setSendingContractEmailId(null);
    }
  };

  const handleCopySigningLink = (contract: ContractItem) => {
    if (!contract.signingToken) {
      showToast('No signing link available', 'error');
      return;
    }
    const link = `${window.location.origin}/sign/contract/${contract.signingToken}`;
    navigator.clipboard.writeText(link);
    showToast('Client e-signing link copied to clipboard!');
  };

  const handleMarkAsLost = async () => {
    if (!id || !opportunity) return;
    const lostStage = stages.find(s => s.isLost);
    if (!lostStage) return;
    try {
      await api.patch(`/api/opportunities/${id}/stage`, { stageId: lostStage.opportunityStageId });
      await loadData();
      setAuditRefreshTrigger(t => t + 1);
      triggerToast('Opportunity marked as Lost', 'error');
    } catch (error) {
      console.error('Failed to mark as lost:', error);
      triggerToast('Failed to update stage', 'error');
    }
  };

  const handleAddLineItem = async () => {
    if (newLineItem.productId === 0) {
      triggerToast('Please select a product first', 'error');
      return;
    }
    if (newLineItem.quantity <= 0) {
      triggerToast('Quantity must be greater than 0', 'error');
      return;
    }
    try {
      await api.post('/api/opportunitylineitems', {
        opportunityId: Number(id),
        ...newLineItem
      });
      setNewLineItem({ productId: 0, quantity: 1, unitPrice: 0, discountPercent: 0 });
      await loadData();
      triggerToast('Line item added successfully', 'success');
    } catch (error) {
      console.error('Failed to add line item:', error);
      triggerToast('Failed to add line item', 'error');
    }
  };

  const handleDeleteLineItem = async (lineItemId: number) => {
    try {
      await api.delete(`/api/opportunitylineitems/${lineItemId}`);
      await loadData();
      triggerToast('Line item removed', 'success');
    } catch (error) {
      console.error('Failed to delete line item:', error);
      triggerToast('Failed to remove line item', 'error');
    }
  };

  const handleProductChange = (productId: number) => {
    const product = products.find(p => p.productId === productId);
    if (product) {
      setNewLineItem(prev => ({
        ...prev,
        productId,
        unitPrice: product.price
      }));
    }
  };

  const handleTaskComplete = (taskId: number) => {
    setTasks(prev => prev.filter(t => t.crmTaskId !== taskId));
  };

  const handleTaskSaved = () => {
    setShowTaskModal(false);
    setEditTask(null);
    loadData();
  };

  const triggerToast = (message: string, type: 'success' | 'error') => {
    const event = new CustomEvent('app:toast', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  };

  const deleteOpportunity = async () => {
    if (!opportunity || !await confirmAction(`Are you sure you want to delete opportunity "${opportunity.title}"?`)) return;
    try {
      await api.delete(`/api/opportunities/${opportunity.opportunityId}`);
      triggerToast('Opportunity deleted successfully', 'success');
      navigate('/opportunities');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to delete opportunity', 'error');
    }
  };

  const calculatedTotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleSyncEstimatedValue = async () => {
    if (!id || !opportunity) return;
    try {
      await api.put(`/api/opportunities/${id}`, {
        ...opportunity,
        estimatedValue: calculatedTotal
      });
      setOpportunity(prev => prev ? ({ ...prev, estimatedValue: calculatedTotal }) : null);
      setEditedOpportunity(prev => ({ ...prev, estimatedValue: calculatedTotal }));
      showToast('Deal value synced with product line items');
    } catch {
      showToast('Failed to sync deal value', 'error');
    }
  };

  const handleSyncCatalogPrices = async () => {
    if (!id || !opportunity) return;
    setSyncingPrices(true);
    try {
      const res = await api.post<any>(`/api/opportunitylineitems/${id}/sync-prices`, {});
      showToast(res.message || 'Product line items updated to current catalog prices!');
      await loadData();
      setAuditRefreshTrigger(t => t + 1);
    } catch (err: any) {
      showToast(err?.message || 'Failed to sync prices with catalog', 'error');
    } finally {
      setSyncingPrices(false);
    }
  };

  const handleQuoteEmailSend = (summaryText: string) => {
    setEmailSubject(`Proposal Quote: ${opportunity?.title || 'Commercial Quote'}`);
    setEmailBody(summaryText);
    setShowQuoteModal(false);
    setShowEmailComposer(true);
  };

  const groupedTasks = (() => {
    const now = new Date();
    const today = now.toDateString();

    const overdue: TaskReadDto[] = [];
    const dueToday: TaskReadDto[] = [];
    const upcoming: TaskReadDto[] = [];
    const completed: TaskReadDto[] = [];

    tasks.forEach(t => {
      if (t.isTerminal) {
        completed.push(t);
        return;
      }
      if (!t.dueDate) {
        upcoming.push(t);
      } else {
        const due = new Date(t.dueDate);
        const dueDateStr = due.toDateString();
        if (due < now) {
          overdue.push(t);
        } else if (dueDateStr === today && due <= now) {
          dueToday.push(t);
        } else {
          upcoming.push(t);
        }
      }
    });
    return { overdue, dueToday, upcoming, completed };
  })();

  if (isLoading || !opportunity) {
    return (
      <Layout>
        <div className="detail-header animate-fade-in">
          <div className="detail-header-info">
            <Skeleton variant="text" className="skeleton-header-title" />
            <Skeleton variant="text" className="skeleton-header-subtitle" style={{ width: '50%' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rect" height={100} style={{ borderRadius: '10px', animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rect" height={56} style={{ borderRadius: '8px', animationDelay: `${i * 0.07}s` }} />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const currentStage = stages.find(s => s.opportunityStageId === (editedOpportunity?.opportunityStageId || opportunity.opportunityStageId));
  const isWonStage = currentStage?.isWon ?? false;
  const isLostStage = currentStage?.isLost ?? false;

  return (
    <Layout>
      <div className="detail-header animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate('/pipeline')}>
          <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
        </Button>
        <div className="detail-header-info">
          <div>
            <h1>{opportunity.title}</h1>
            <p>
              Customer: <Link to={`/customers/${opportunity.customerId}`} style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                {opportunity.customerFirstName} {opportunity.customerLastName}
              </Link>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button
            variant="ghost"
            onClick={() => {
              setEmailSubject(`Regarding: ${opportunity.title}`);
              setEmailBody(`Dear ${opportunity.customerFirstName},\n\nI hope this email finds you well.\n\nBest regards,\n${opportunity.ownerName || currentUser?.name || 'Sales Team'}`);
              setShowEmailComposer(true);
            }}
            style={{ border: '1px solid rgba(99, 102, 241, 0.4)', color: '#818cf8' }}
            title="Compose and send an email to customer"
          >
            <Mail size={16} style={{ marginRight: 4 }} /> Email Customer
          </Button>
          <Button
            variant="secondary"
            onClick={handleOpenCreateContract}
            style={{ border: '1px solid rgba(99, 102, 241, 0.4)', color: '#818cf8' }}
            title={contracts.length > 0 ? `View attached contract (${contracts[0].contractNumber})` : 'Create commercial contract for this deal'}
          >
            <FileSignature size={16} style={{ marginRight: 4 }} /> {contracts.length > 0 ? 'View Contract' : 'Create Contract'}
          </Button>
          <Button variant="ghost" onClick={handleMarkAsWon} style={{ border: '1px solid var(--success)', color: 'var(--success)' }}>
            <Check size={16} style={{ marginRight: 4 }} /> Mark Won
          </Button>
          <Button variant="ghost" onClick={handleMarkAsLost} style={{ border: '1px solid var(--danger)', color: 'var(--danger)' }}>
            <XCircle size={16} style={{ marginRight: 4 }} /> Mark Lost
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Details'}
          </Button>
          <Button variant="ghost" size="sm" onClick={deleteOpportunity} style={{ color: 'var(--accent-red, #ef4444)' }}>
            <Trash2 size={16} style={{ marginRight: 4 }} /> Delete
          </Button>
        </div>
      </div>

      <div className="detail-layout animate-fade-in">
        {/* Left Info Panel */}
        <Card className="glass-panel detail-sidebar">
          <Card.Content>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', marginTop: 0 }}>
              Opportunity Info
            </h3>
            <div className="customer-details">
              <div className="detail-row">
                <Tag size={15} />
                <span>Stage: <strong>{opportunity.stageName}</strong></span>
              </div>
              <div className="detail-row" style={{ alignItems: 'flex-start' }}>
                <Building2 size={15} style={{ marginTop: '3px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                  <span>Value: <strong>{formatCurrency(opportunity.estimatedValue)}</strong></span>
                  {lineItems.length > 0 && Math.abs(opportunity.estimatedValue - calculatedTotal) > 0.01 && (
                    <button
                      type="button"
                      onClick={handleSyncEstimatedValue}
                      style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#f59e0b',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginTop: '3px',
                        textAlign: 'left',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Sync opportunity deal value with current line items total"
                    >
                      <RefreshCw size={11} /> Sync to Products ({formatCurrency(calculatedTotal)})
                    </button>
                  )}
                </div>
              </div>
              <div className="detail-row" style={{ alignItems: 'flex-start' }}>
                <Calendar size={15} style={{ marginTop: '3px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>Expected Close: <strong>{formatDisplayDate(opportunity.expectedCloseDate)}</strong></span>
                  {opportunity.expectedCloseDate && (() => {
                    const status = getExpectedCloseDateStatus(opportunity.expectedCloseDate, isWonStage, isLostStage);
                    return (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: status.color,
                          background: status.bg || 'transparent',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          width: 'fit-content',
                          marginTop: '2px'
                        }}
                      >
                        {status.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div className="detail-row">
                <User size={15} />
                <span>Owner: <strong>{opportunity.ownerName}</strong></span>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Right Main Panel */}
        <div className="detail-main">
          {/* AI Deal Win Forecast */}
          <div style={{ marginBottom: '1.25rem' }}>
            <AiOpportunityAssistant opportunityId={opportunity.opportunityId} />
          </div>

          <div className="tabs-bar">
            {(['details', 'lineItems', 'contracts', 'activities', 'tasks', 'attachments', 'audit'] as TabId[]).map(tab => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'details' && <span>Details</span>}
                {tab === 'lineItems' && <span>Products & Quote ({lineItems.length})</span>}
                {tab === 'contracts' && <span>📜 Contracts & Billing ({contracts.length + invoices.length})</span>}
                {tab === 'activities' && <span>Activities ({activities.length})</span>}
                {tab === 'tasks' && <span>Tasks ({tasks.filter(t => !t.isTerminal).length})</span>}
                {tab === 'attachments' && <span>📎 Attachments</span>}
                {tab === 'audit' && <span><History size={14} style={{ marginRight: 4 }} /> Audit History</span>}
              </button>
            ))}
          </div>

          <Card className="glass-panel">
            <Card.Content>
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="profile-grid">
                  <div className="profile-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Title</label>
                    <Input
                      value={editedOpportunity.title || ''}
                      onChange={e => handleFieldChange('title', e.target.value)}
                    />
                  </div>

                  <div className="profile-field">
                    <label>Stage</label>
                    <SelectDown
                      value={editedOpportunity.opportunityStageId || opportunity.opportunityStageId}
                      options={stages.map(s => ({ value: s.opportunityStageId, label: s.name }))}
                      onChange={val => handleFieldChange('opportunityStageId', Number(val))}
                    />
                  </div>

                  <div className="profile-field">
                    <label>Owner</label>
                    <SelectDown
                      value={editedOpportunity.ownerId || opportunity.ownerId}
                      options={users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name }))}
                      onChange={val => handleFieldChange('ownerId', Number(val))}
                    />
                  </div>

                  <div className="profile-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label style={{ margin: 0 }}>Estimated Value ({profile?.currency || currency})</label>
                      {lineItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleFieldChange('estimatedValue', calculatedTotal)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#818cf8',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          ⚡ Use Products Total ({formatCurrency(calculatedTotal)})
                        </button>
                      )}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedOpportunity.estimatedValue ?? opportunity.estimatedValue}
                      onChange={e => handleFieldChange('estimatedValue', Number(e.target.value))}
                    />
                  </div>

                  <div className="profile-field">
                    <label>Expected Close Date</label>
                    <DatePicker
                      value={editedOpportunity.expectedCloseDate?.split('T')[0] || opportunity.expectedCloseDate?.split('T')[0] || ''}
                      onChange={e => handleFieldChange('expectedCloseDate', e)}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                      {getStandardCloseDatePresets().map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleFieldChange('expectedCloseDate', preset.value)}
                          style={{
                            padding: '0.15rem 0.4rem',
                            fontSize: '0.7rem',
                            borderRadius: '4px',
                            border: (editedOpportunity.expectedCloseDate?.split('T')[0] || opportunity.expectedCloseDate?.split('T')[0]) === preset.value ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            background: (editedOpportunity.expectedCloseDate?.split('T')[0] || opportunity.expectedCloseDate?.split('T')[0]) === preset.value ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                            color: (editedOpportunity.expectedCloseDate?.split('T')[0] || opportunity.expectedCloseDate?.split('T')[0]) === preset.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    {(editedOpportunity.expectedCloseDate || opportunity.expectedCloseDate) && (() => {
                      const currentDate = editedOpportunity.expectedCloseDate || opportunity.expectedCloseDate;
                      const status = getExpectedCloseDateStatus(currentDate, isWonStage, isLostStage);
                      if (status.status === 'overdue') {
                        return (
                          <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                            ⚠️ Deal is overdue by {Math.abs(status.diffDays || 0)} days. Consider pushing date.
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="profile-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Description</label>
                    <textarea
                      value={editedOpportunity.description || ''}
                      onChange={e => handleFieldChange('description', e.target.value)}
                      className="input-field"
                      style={{ minHeight: '100px' }}
                    />
                  </div>
                </div>
              )}

              {/* Line Items / Products Tab */}
              {activeTab === 'lineItems' && (() => {
                const grossSubtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                const totalDiscountSavings = grossSubtotal - calculatedTotal;
                const totalUnits = lineItems.reduce((sum, item) => sum + item.quantity, 0);
                const dealEstimatedValue = editedOpportunity?.estimatedValue ?? opportunity?.estimatedValue ?? 0;
                const variance = dealEstimatedValue - calculatedTotal;
                const isValueSynced = Math.abs(variance) < 0.01;

                const outdatedPriceItems = lineItems.filter(item => {
                  const catProd = products.find(p => p.productId === item.productId);
                  return catProd && Math.abs(catProd.price - item.unitPrice) > 0.001;
                });

                return (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Header & Main Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Package size={20} style={{ color: 'var(--accent-primary)' }} /> Opportunity Products & Quotation
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Configure itemized product line items, apply volume discounts, and export proposal quotes.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleSyncCatalogPrices}
                          disabled={syncingPrices || lineItems.length === 0}
                          style={outdatedPriceItems.length > 0 ? { borderColor: '#f59e0b', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' } : {}}
                          title="Update all line items with latest unit prices configured in Settings/Products"
                        >
                          <RefreshCw size={14} className={syncingPrices ? 'spin' : ''} style={{ marginRight: 5 }} />
                          {syncingPrices ? 'Syncing…' : outdatedPriceItems.length > 0 ? `Sync Catalog Prices (${outdatedPriceItems.length})` : 'Sync Catalog Prices'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleSyncEstimatedValue}
                          disabled={isValueSynced || calculatedTotal === 0}
                          title={isValueSynced ? 'Deal value already matches quoted total' : 'Update deal estimated value to match quoted total'}
                        >
                          <RefreshCw size={14} style={{ marginRight: 5 }} /> Sync Deal Value
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleOpenCreateContract}
                          style={{ border: '1px solid rgba(99, 102, 241, 0.4)', color: '#818cf8' }}
                          title="Generate legal contract with these quoted products"
                        >
                          <FileSignature size={14} style={{ marginRight: 5 }} /> Create Contract from Quote
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const itemsSummary = lineItems.map(i => `- ${i.product?.name || 'Product'} (Qty: ${i.quantity}, Price: ${formatCurrency(i.unitPrice)}, Total: ${formatCurrency(i.totalPrice)})`).join('\n');
                            const quoteNumber = `QT-${new Date().getFullYear()}-${String(opportunity.opportunityId).padStart(5, '0')}`;
                            const emailBody = `Dear ${opportunity.customerFirstName} ${opportunity.customerLastName},\n\nPlease find your proposal quote details below:\n\nQuote Reference: ${quoteNumber}\nDeal: ${opportunity.title}\nDate: ${new Date().toLocaleDateString()}\n\nPROPOSAL ITEMS:\n${itemsSummary || 'Standard Deal Proposal'}\n\nGRAND TOTAL: ${formatCurrency(calculatedTotal)}\n\nPlease let us know if you have any questions.\n\nBest regards,\n${opportunity.ownerName || currentUser?.name || 'Sales Team'}`;
                            setEmailSubject(`Proposal Quote: ${opportunity.title} (${quoteNumber})`);
                            setEmailBody(emailBody);
                            setShowEmailComposer(true);
                          }}
                          disabled={lineItems.length === 0}
                          style={{ border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8' }}
                          title="Compose and send quotation details via email"
                        >
                          <Mail size={14} style={{ marginRight: 5 }} /> Email Quote
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setShowQuoteModal(true)}
                          disabled={lineItems.length === 0}
                        >
                          <FileText size={14} style={{ marginRight: 5 }} /> Generate Proposal Quote
                        </Button>
                      </div>
                    </div>

                    {/* Outdated Catalog Prices Alert Banner */}
                    {outdatedPriceItems.length > 0 && (
                      <div style={{
                        padding: '0.85rem 1.1rem',
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        borderRadius: '0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <AlertTriangle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f59e0b' }}>
                              Product Catalog Price Changes Detected in Settings
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {outdatedPriceItems.length} product line item(s) have unit prices different from current Settings/Products catalog prices.
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSyncCatalogPrices}
                          disabled={syncingPrices}
                          style={{ background: '#f59e0b', borderColor: '#d97706', color: '#000', fontWeight: 700 }}
                        >
                          <RefreshCw size={13} className={syncingPrices ? 'spin' : ''} style={{ marginRight: 4 }} />
                          {syncingPrices ? 'Updating Prices…' : 'Sync All to Current Catalog Prices'}
                        </Button>
                      </div>
                    )}

                    {/* Financial Metric Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                      <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-secondary)', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Quoted Value</span>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981', marginTop: '0.15rem' }}>
                          {formatCurrency(calculatedTotal, profile?.currency || currency, 2)}
                        </div>
                      </div>

                      <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-secondary)', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Products / Units</span>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                          {lineItems.length} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>({totalUnits} unit{totalUnits === 1 ? '' : 's'})</span>
                        </div>
                      </div>

                      <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-secondary)', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Discount Savings</span>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: totalDiscountSavings > 0 ? '#f59e0b' : 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {formatCurrency(totalDiscountSavings, profile?.currency || currency, 2)}
                        </div>
                      </div>

                      <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-secondary)', borderRadius: '0.65rem', border: isValueSynced ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Deal Value Alignment</span>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.35rem', color: isValueSynced ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {isValueSynced ? (
                            <>
                              <CheckCircle2 size={16} /> Matches Estimate
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={16} /> Variance: {formatCurrency(Math.abs(variance), profile?.currency || currency, 2)}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Add Product Form Card */}
                    <div style={{ padding: '1.1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Plus size={15} style={{ color: 'var(--accent-primary)' }} /> Add Product / Service to Quote
                        </h4>
                        {newLineItem.productId > 0 && (
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981' }}>
                            Row Subtotal: {formatCurrency(newLineItem.quantity * newLineItem.unitPrice * (1 - newLineItem.discountPercent / 100), profile?.currency || currency, 2)}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) minmax(85px, 0.8fr) minmax(110px, 1fr) minmax(95px, 0.9fr) auto', gap: '0.75rem', alignItems: 'flex-end' }}>
                        <div>
                          <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Select Product *</label>
                          <SearchableSelect
                            value={newLineItem.productId ? String(newLineItem.productId) : ''}
                            options={[
                              { value: '', label: 'Select a product catalog item...' },
                              ...products.map(p => ({
                                value: String(p.productId),
                                label: `${p.name} (${formatCurrency(p.price, profile?.currency || currency, 2)})`
                              }))
                            ]}
                            onChange={val => handleProductChange(Number(val))}
                            placeholder="Search product..."
                          />
                        </div>

                        <div>
                          <Input
                            label="Qty *"
                            type="number"
                            min="1"
                            value={newLineItem.quantity}
                            onChange={e => setNewLineItem(prev => ({ ...prev, quantity: Math.max(1, Number(e.target.value)) }))}
                          />
                        </div>

                        <div>
                          <Input
                            label={`Unit Price (${profile?.currency || currency}) *`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={newLineItem.unitPrice}
                            onChange={e => setNewLineItem(prev => ({ ...prev, unitPrice: Number(e.target.value) }))}
                          />
                        </div>

                        <div>
                          <Input
                            label="Discount (%)"
                            type="number"
                            min="0"
                            max="100"
                            value={newLineItem.discountPercent}
                            onChange={e => setNewLineItem(prev => ({ ...prev, discountPercent: Number(e.target.value) }))}
                          />
                        </div>

                        <Button onClick={handleAddLineItem} size="sm" style={{ height: '38px', minWidth: '105px', alignSelf: 'flex-end' }}>
                          <Plus size={14} style={{ marginRight: 4 }} /> Add Item
                        </Button>
                      </div>
                    </div>

                    {/* Products Table or Empty State */}
                    {lineItems.length === 0 ? (
                      <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px dashed var(--border-color)' }}>
                        <ShoppingBag size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto', opacity: 0.6 }} />
                        <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>No Products Added Yet</h4>
                        <p style={{ margin: '0 auto 1rem auto', maxWidth: '420px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Add itemized products and services to this deal to calculate precise pricing, generate professional PDF quotes, and boost AI forecast accuracy.
                        </p>
                      </div>
                    ) : (
                      <div style={{ borderRadius: '0.75rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <th style={{ padding: '0.75rem 1rem' }}>Product / Service</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Qty</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Unit Price</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Discount</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '60px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {lineItems.map((item, idx) => {
                              const catalogProduct = products.find(p => p.productId === item.productId);
                              const hasPriceChanged = catalogProduct && Math.abs(catalogProduct.price - item.unitPrice) > 0.001;

                              return (
                                <tr key={item.lineItemId} style={{ borderBottom: idx < lineItems.length - 1 ? '1px solid var(--border-color)' : 'none', background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)' }}>
                                  <td style={{ padding: '0.85rem 1rem' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.product?.name || 'Custom Product'}</div>
                                    {item.product?.sku && (
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '0.1rem 0.35rem', borderRadius: '3px', marginTop: '2px', display: 'inline-block' }}>
                                        SKU: {item.product.sku}
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                                    {item.product?.productCategory?.name ? (
                                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '1rem', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                        {item.product.productCategory.name}
                                      </span>
                                    ) : '—'}
                                  </td>
                                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                      {formatCurrency(item.unitPrice, profile?.currency || currency, 2)}
                                    </div>
                                    {hasPriceChanged && (
                                      <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '2px', fontWeight: 600 }} title="Current price configured in Settings/Products catalog">
                                        Catalog: {formatCurrency(catalogProduct.price, profile?.currency || currency, 2)}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                                    {item.discountPercent > 0 ? (
                                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                                        {item.discountPercent}% OFF
                                      </span>
                                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                  </td>
                                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#10b981', fontSize: '0.92rem' }}>
                                    {formatCurrency(item.totalPrice, profile?.currency || currency, 2)}
                                  </td>
                                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      className="icon-btn danger"
                                      onClick={() => handleDeleteLineItem(item.lineItemId)}
                                      title="Remove item"
                                      style={{ padding: '0.35rem', color: 'var(--text-muted)', transition: 'color 0.15s ease' }}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border-color)', fontWeight: 700 }}>
                              <td colSpan={5} style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.78rem' }}>
                                Quotation Grand Total:
                              </td>
                              <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '1.05rem', color: '#10b981', fontWeight: 800 }}>
                                {formatCurrency(calculatedTotal, profile?.currency || currency, 2)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Contracts & Billing Tab */}
              {activeTab === 'contracts' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {/* Section 1: Contracts CRUD */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <FileSignature size={18} style={{ color: '#818cf8' }} /> Legal Contracts & E-Signatures ({contracts.length})
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Official service agreements and digital signature links linked to this opportunity.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {contracts.length > 0 && (
                          <span style={{ fontSize: '0.78rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                            ✓ {contracts.length} Contract{contracts.length > 1 ? 's' : ''} Linked
                          </span>
                        )}
                        <Button variant="primary" size="sm" onClick={handleOpenCreateContract}>
                          <Plus size={14} style={{ marginRight: 4 }} /> Draft Contract
                        </Button>
                      </div>
                    </div>

                    {contracts.length === 0 ? (
                      <div style={{ padding: '2rem 1.5rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px dashed var(--border-color)' }}>
                        <FileSignature size={36} style={{ color: '#818cf8', margin: '0 auto 0.5rem auto', opacity: 0.7 }} />
                        <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>No Contracts Generated Yet</h4>
                        <p style={{ margin: '0 auto 1rem auto', maxWidth: '400px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Turn your deal and line item quote into a binding legal contract with online e-signatures.
                        </p>
                        <Button variant="secondary" size="sm" onClick={handleOpenCreateContract}>
                          <Plus size={14} style={{ marginRight: 4 }} /> Create Contract for {formatCurrency(currentQuotedTotal > 0 ? currentQuotedTotal : opportunity.estimatedValue, profile?.currency || currency)}
                        </Button>
                      </div>
                    ) : (
                      <div className="bounded-scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px' }}>
                        {contracts.map(contract => {
                          const isSigned = contract.status === 'Signed' || contract.status === 'Active' || !!contract.signatureDataUrl || !!contract.signedAt;
                          const isContractOutdated = !isSigned && (Math.abs((contract.contractValue || 0) - currentQuotedTotal) > 0.01 || hasOutdatedCatalogPrices);

                          return (
                            <div
                              key={contract.contractId}
                              style={{
                                padding: '1rem 1.25rem',
                                background: 'var(--bg-secondary)',
                                borderRadius: '0.75rem',
                                border: isSigned ? '1px solid rgba(16, 185, 129, 0.3)' : isContractOutdated ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '1rem'
                              }}
                            >
                              <div style={{ minWidth: '240px', flex: '1 1 auto' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{contract.title}</strong>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                    {contract.contractNumber}
                                  </span>
                                  <span
                                    style={{
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '1rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      background: isSigned ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                      color: isSigned ? '#10b981' : '#f59e0b',
                                      border: isSigned ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                                    }}
                                  >
                                    {isSigned ? 'Signed & Active' : (contract.status || 'Draft')}
                                  </span>
                                  {isContractOutdated && (
                                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.12rem 0.45rem', borderRadius: '4px', fontWeight: 600 }} title="Contract value differs from current quote/catalog price">
                                      ⚠️ Price Outdated (Quote: {formatCurrency(currentQuotedTotal, profile?.currency || currency)})
                                    </span>
                                  )}
                                </div>

                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                  <span>Value: <strong style={{ color: '#10b981' }}>{formatCurrency(contract.contractValue, profile?.currency || currency)}</strong></span>
                                  <span>Start: {formatDisplayDate(contract.startDate)}</span>
                                  <span>End: {formatDisplayDate(contract.endDate)}</span>
                                  {contract.signedByName && <span>Signed By: <strong>{contract.signedByName}</strong></span>}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                {isContractOutdated && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleSyncContractPricing(contract.contractId)}
                                    disabled={syncingContractId === contract.contractId}
                                    style={{ border: '1px solid #f59e0b', color: '#f59e0b', fontSize: '0.8rem', background: 'rgba(245, 158, 11, 0.1)' }}
                                    title="Synchronize contract value to current product catalog and quote total"
                                  >
                                    <RefreshCw size={13} style={{ marginRight: 4 }} className={syncingContractId === contract.contractId ? 'animate-spin' : ''} />
                                    {syncingContractId === contract.contractId ? 'Syncing…' : 'Sync Value'}
                                  </Button>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedContractForModal(contract)}
                                  style={{ border: '1px solid var(--border-color)', fontSize: '0.8rem' }}
                                  title="View agreement & e-signatures"
                                >
                                  <Eye size={13} style={{ marginRight: 4 }} /> View & Sign
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditContract(contract)}
                                  style={{ border: '1px solid var(--border-color)', fontSize: '0.8rem' }}
                                  title="Edit contract details"
                                >
                                  <Pencil size={13} style={{ marginRight: 4 }} /> Edit
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopySigningLink(contract)}
                                  style={{ border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', fontSize: '0.8rem' }}
                                  title="Copy public signing URL"
                                >
                                  <LinkIcon size={13} style={{ marginRight: 4 }} /> Copy Link
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEmailContract(contract)}
                                  disabled={sendingContractEmailId === contract.contractId}
                                  style={{ border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: '0.8rem' }}
                                  title="Email contract signing link directly to customer"
                                >
                                  <Mail size={13} style={{ marginRight: 4 }} />
                                  {sendingContractEmailId === contract.contractId ? 'Sending…' : 'Email'}
                                </Button>

                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleOpenCreateInvoice(contract)}
                                  style={{ fontSize: '0.8rem' }}
                                  title="Generate or update billing invoice"
                                >
                                  <Receipt size={13} style={{ marginRight: 4 }} /> Invoice
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteContract(contract)}
                                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '0.35rem 0.5rem' }}
                                  title="Delete contract"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Invoices CRUD */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Receipt size={18} style={{ color: '#10b981' }} /> Billing Invoices & Payments ({invoices.length})
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Financial invoices and payment collections for this opportunity.
                        </p>
                      </div>

                      <Button variant="primary" size="sm" onClick={() => handleOpenCreateInvoice()} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        <Plus size={14} style={{ marginRight: 4 }} /> Draft Invoice
                      </Button>
                    </div>

                    {invoices.length === 0 ? (
                      <div style={{ padding: '1.75rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px dashed var(--border-color)' }}>
                        <Receipt size={34} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem auto', opacity: 0.6 }} />
                        <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>No Invoices Generated Yet</h4>
                        <p style={{ margin: '0 auto 1rem auto', maxWidth: '420px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Generate an invoice from this deal or contract to collect client payments via Stripe or manual recording.
                        </p>
                        <Button variant="secondary" size="sm" onClick={() => handleOpenCreateInvoice()}>
                          <Plus size={14} style={{ marginRight: 4 }} /> Create Invoice for {formatCurrency(currentQuotedTotal > 0 ? currentQuotedTotal : opportunity.estimatedValue, profile?.currency || currency)}
                        </Button>
                      </div>
                    ) : (
                      <div className="bounded-scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px' }}>
                        {invoices.map((inv: any) => {
                          const invStatus = (inv.status || '').toLowerCase();
                          const isPaid = invStatus === 'paid' || (inv.balanceDue !== undefined && inv.balanceDue <= 0.01 && (inv.amountPaid || 0) > 0);
                          const isPartiallyPaid = invStatus === 'partiallypaid' || ((inv.amountPaid || 0) > 0 && (inv.balanceDue || 0) > 0.01);
                          const isCancelledOrRefunded = invStatus === 'cancelled' || invStatus === 'refunded';
                          const isPendingVerification = invStatus === 'pendingverification';
                          const isPayable = !isPaid && !isCancelledOrRefunded && !isPendingVerification;
                          const isInvoiceOutdated = (invStatus === 'draft' || invStatus === 'sent') && (Math.abs((inv.amount || 0) - currentQuotedTotal) > 0.01 || hasOutdatedCatalogPrices);

                          const statusBg = isPaid ? 'rgba(16, 185, 129, 0.15)' : isPartiallyPaid ? 'rgba(99, 102, 241, 0.15)' : inv.status === 'Sent' ? 'rgba(99, 102, 241, 0.15)' : isCancelledOrRefunded ? 'rgba(239, 68, 68, 0.15)' : inv.status === 'Overdue' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)';
                          const statusColor = isPaid ? '#10b981' : isPartiallyPaid ? '#818cf8' : inv.status === 'Sent' ? '#818cf8' : isCancelledOrRefunded ? '#ef4444' : inv.status === 'Overdue' ? '#ef4444' : '#f59e0b';
                          const statusBorder = isPaid ? '1px solid rgba(16, 185, 129, 0.3)' : isPartiallyPaid ? '1px solid rgba(99, 102, 241, 0.3)' : inv.status === 'Sent' ? '1px solid rgba(99, 102, 241, 0.3)' : isCancelledOrRefunded ? '1px solid rgba(239, 68, 68, 0.3)' : inv.status === 'Overdue' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)';

                          return (
                            <div
                              key={inv.invoiceId}
                              style={{
                                padding: '1rem 1.25rem',
                                background: 'var(--bg-secondary)',
                                borderRadius: '0.75rem',
                                border: isPaid ? '1px solid rgba(16, 185, 129, 0.3)' : isInvoiceOutdated ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '1rem'
                              }}
                            >
                              <div style={{ minWidth: '240px', flex: '1 1 auto' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{inv.invoiceNumber}</strong>
                                  <span
                                    style={{
                                      padding: '0.12rem 0.5rem',
                                      borderRadius: '1rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      background: statusBg,
                                      color: statusColor,
                                      border: statusBorder
                                    }}
                                  >
                                    {isPaid ? 'Paid' : isPartiallyPaid ? 'Partially Paid' : isPendingVerification ? 'Pending Verification' : isCancelledOrRefunded ? inv.status : inv.status}
                                  </span>
                                  {inv.contract?.contractNumber && (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                      Contract: {inv.contract.contractNumber}
                                    </span>
                                  )}
                                  {isInvoiceOutdated && (
                                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.12rem 0.45rem', borderRadius: '4px', fontWeight: 600 }} title="Invoice amount differs from current quote/catalog price">
                                      ⚠️ Price Outdated (Quote: {formatCurrency(currentQuotedTotal, profile?.currency || currency)})
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                  <span>Total: <strong style={{ color: '#10b981', fontSize: '0.9rem' }}>{formatCurrency(inv.totalAmount ?? inv.amount, profile?.currency || currency, 2)}</strong></span>
                                  {inv.amountPaid > 0 && <span style={{ color: '#10b981' }}>Paid: {formatCurrency(inv.amountPaid, profile?.currency || currency, 2)}</span>}
                                  {inv.balanceDue > 0 && <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Due: {formatCurrency(inv.balanceDue, profile?.currency || currency, 2)}</span>}
                                  {inv.taxAmount > 0 && <span>(Tax: {formatCurrency(inv.taxAmount, profile?.currency || currency, 2)})</span>}
                                  <span>Issue: {formatDisplayDate(inv.issueDate)}</span>
                                  <span>Due: {formatDisplayDate(inv.dueDate)}</span>
                                  {isPaid && inv.paymentMethod && <span>Paid via: <strong>{inv.paymentMethod}</strong></span>}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                {isInvoiceOutdated && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleSyncInvoicePricing(inv.invoiceId)}
                                    disabled={syncingInvoiceId === inv.invoiceId}
                                    style={{ border: '1px solid #f59e0b', color: '#f59e0b', fontSize: '0.8rem', background: 'rgba(245, 158, 11, 0.1)' }}
                                    title="Synchronize invoice amount to current product catalog and quote total"
                                  >
                                    <RefreshCw size={13} style={{ marginRight: 4 }} className={syncingInvoiceId === inv.invoiceId ? 'animate-spin' : ''} />
                                    {syncingInvoiceId === inv.invoiceId ? 'Syncing…' : 'Sync Amount'}
                                  </Button>
                                )}

                                {isPayable && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleSendPaymentRequest(inv)}
                                    style={{ fontSize: '0.8rem' }}
                                    title="Send payment request link to customer"
                                  >
                                    <Send size={13} style={{ marginRight: 3, color: 'var(--accent-primary)' }} /> Send Link
                                  </Button>
                                )}

                                {isPayable && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyPaymentLink(inv)}
                                    style={{ border: '1px solid var(--border-color)', fontSize: '0.8rem' }}
                                    title="Copy customer payment portal link"
                                  >
                                    <Copy size={13} style={{ marginRight: 3 }} /> {isPartiallyPaid ? 'Copy Partial Link' : 'Copy Link'}
                                  </Button>
                                )}

                                {!isPaid && !isCancelledOrRefunded && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenPayInvoice(inv)}
                                    style={{ border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: '0.8rem' }}
                                    title="Record payment received from customer"
                                  >
                                    <DollarSign size={13} style={{ marginRight: 3 }} /> Record Payment
                                  </Button>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditInvoice(inv)}
                                  style={{ border: '1px solid var(--border-color)', fontSize: '0.8rem' }}
                                  title="Edit invoice details"
                                >
                                  <Pencil size={13} style={{ marginRight: 3 }} /> Edit
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteInvoice(inv)}
                                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '0.35rem 0.5rem' }}
                                  title="Delete invoice"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Activities Tab */}
              {activeTab === 'activities' && (
                <TimelineList
                  activities={activities}
                  activityTypes={activityTypes}
                  opportunityId={opportunity.opportunityId}
                  currentUserId={currentUser?.userId}
                  isAdmin={currentUser?.roles?.includes('Admin') ?? false}
                  onActivityLogged={(act) => setActivities(prev => [act, ...prev])}
                  onActivityDeleted={(id) => setActivities(prev => prev.filter(a => a.activityId !== id))}
                />
              )}

              {/* Tasks Tab */}
              {activeTab === 'tasks' && (
                <div>
                  <div style={{ display: 'flex', justifySelf: 'end', marginBottom: '1rem' }}>
                    <button
                      type="button"
                      className="btn-outline-sm"
                      onClick={() => navigate(`/tasks/new?opportunityId=${opportunity.opportunityId}${opportunity.customerId ? `&customerId=${opportunity.customerId}` : ''}`)}
                    >
                      <Plus size={14} /> New Task
                    </button>
                  </div>
                  <div className="bounded-scroll-container" style={{ maxHeight: '480px' }}>
                    <TaskListGroup
                      overdue={groupedTasks.overdue}
                      dueToday={groupedTasks.dueToday}
                      upcoming={groupedTasks.upcoming}
                      completed={groupedTasks.completed}
                      onTaskComplete={handleTaskComplete}
                      onTaskDelete={loadData}
                      onTaskClick={(t) => navigate(`/tasks/${t.crmTaskId}/edit`)}
                    />
                  </div>
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === 'attachments' && (
                <Attachments entity="opportunity" entityId={opportunity.opportunityId} canEdit={true} />
              )}

              {/* Audit History Tab */}
              {activeTab === 'audit' && (
                <AuditHistoryTable entityType="opportunities" entityId={opportunity.opportunityId} entityName={opportunity.title} />
              )}
            </Card.Content>
          </Card>
        </div>
      </div>

      {showQuoteModal && opportunity && (
        <QuoteModal
          opportunity={opportunity}
          lineItems={lineItems}
          onClose={() => setShowQuoteModal(false)}
          onSendEmail={handleQuoteEmailSend}
        />
      )}

      {showEmailComposer && opportunity && (
        <EmailComposerModal
          isOpen={showEmailComposer}
          onClose={() => setShowEmailComposer(false)}
          defaultRecipient={opportunity.customerEmail}
          recipientName={`${opportunity.customerFirstName} ${opportunity.customerLastName}`}
          initialSubject={emailSubject}
          initialBody={emailBody}
          opportunityId={opportunity.opportunityId}
          customerId={opportunity.customerId}
          onEmailSent={() => showToast('Proposal Quote sent via Email')}
        />
      )}

      {/* Create Contract Modal */}
      {showCreateContractModal && opportunity && (
        <div className="crm-modal-overlay">
          <div className="crm-modal-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(129, 140, 248, 0.1) 100%)',
                  color: 'var(--accent-primary)',
                  padding: '0.5rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex'
                }}>
                  <FileSignature size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {contracts.length > 0 ? 'Edit Commercial Contract' : 'Create Commercial Contract'}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Draft a legal agreement linked to this deal
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateContractModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
              >
                <X size={20} />
              </button>
            </div>
            {contracts.length > 0 && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', fontSize: '0.82rem', color: '#818cf8', marginBottom: '1.25rem' }}>
                ℹ️ Contract <strong>{contracts[0].contractNumber}</strong> is already attached to this deal. Submitting will update the existing contract.
              </div>
            )}

            <form onSubmit={handleCreateContractSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Contract Title *
                </label>
                <Input
                  value={newContractTitle}
                  onChange={e => setNewContractTitle(e.target.value)}
                  required
                  placeholder="e.g. Master Services Agreement"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Contract Value ({profile?.currency || currency}) *
                    </label>
                    {currentQuotedTotal > 0 && Math.abs(newContractValue - currentQuotedTotal) > 0.01 && (
                      <button
                        type="button"
                        onClick={() => setNewContractValue(currentQuotedTotal)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                      >
                        ⚡ Use Quoted Total ({formatCurrency(currentQuotedTotal, profile?.currency || currency)})
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newContractValue}
                    onChange={e => setNewContractValue(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Customer Account
                  </label>
                  <div style={{ padding: '0.55rem 0.85rem', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                    👤 {opportunity.customerFirstName} {opportunity.customerLastName}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Standard Terms &amp; Conditions
                </label>
                <textarea
                  value={newContractTerms}
                  onChange={e => setNewContractTerms(e.target.value)}
                  rows={3}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.82rem', background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button type="button" variant="ghost" onClick={() => setShowCreateContractModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={creatingContract} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)' }}>
                  {creatingContract ? 'Creating…' : 'Generate Contract'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contract Modal */}
      {editingContract && (
        <div className="crm-modal-overlay">
          <div className="crm-modal-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(129, 140, 248, 0.1) 100%)',
                  color: 'var(--accent-primary)',
                  padding: '0.5rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex'
                }}>
                  <Pencil size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Edit Contract ({editingContract.contractNumber})
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Update commercial agreement details
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingContract(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditContractSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Contract Title *
                </label>
                <Input
                  value={editContractTitle}
                  onChange={e => setEditContractTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Contract Value ({profile?.currency || currency}) *
                    </label>
                    {currentQuotedTotal > 0 && Math.abs(editContractValue - currentQuotedTotal) > 0.01 && (
                      <button
                        type="button"
                        onClick={() => setEditContractValue(currentQuotedTotal)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                      >
                        ⚡ Use Quoted Total ({formatCurrency(currentQuotedTotal, profile?.currency || currency)})
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editContractValue}
                    onChange={e => setEditContractValue(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Contract Status
                  </label>
                  <SelectDown
                    value={editContractStatus}
                    onChange={val => setEditContractStatus(String(val))}
                    options={[
                      { value: 'Draft', label: 'Draft' },
                      { value: 'SentForSignature', label: 'Sent For Signature' },
                      { value: 'Signed', label: 'Signed' },
                      { value: 'Active', label: 'Active' },
                      { value: 'Terminated', label: 'Terminated' }
                    ]}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={editContractStartDate}
                    onChange={e => setEditContractStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={editContractEndDate}
                    onChange={e => setEditContractEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Terms &amp; Conditions
                </label>
                <textarea
                  value={editContractTerms}
                  onChange={e => setEditContractTerms(e.target.value)}
                  rows={2}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.82rem', background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Internal Notes
                </label>
                <Input
                  value={editContractNotes}
                  onChange={e => setEditContractNotes(e.target.value)}
                  placeholder="Optional internal notes..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button type="button" variant="ghost" onClick={() => setEditingContract(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={savingContract} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)' }}>
                  {savingContract ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateInvoiceModal && (
        <div className="crm-modal-overlay">
          <div className="crm-modal-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
                  color: '#10b981',
                  padding: '0.5rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex'
                }}>
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Create Billing Invoice
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Issue commercial billing invoice for this deal
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateInvoiceModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Invoice Amount ({profile?.currency || currency}) *
                    </label>
                    {currentQuotedTotal > 0 && Math.abs(newInvoiceAmount - currentQuotedTotal) > 0.01 && (
                      <button
                        type="button"
                        onClick={() => setNewInvoiceAmount(currentQuotedTotal)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                      >
                        ⚡ Use Quoted Total ({formatCurrency(currentQuotedTotal, profile?.currency || currency)})
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newInvoiceAmount}
                    onChange={e => setNewInvoiceAmount(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Tax Rate (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={newInvoiceTaxRate}
                    onChange={e => setNewInvoiceTaxRate(Number(e.target.value))}
                  />
                </div>
              </div>

              {contracts.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Link to Legal Contract
                  </label>
                  <SelectDown
                    value={newInvoiceContractId ? String(newInvoiceContractId) : '0'}
                    onChange={val => setNewInvoiceContractId(Number(val) > 0 ? Number(val) : null)}
                    options={[
                      { value: '0', label: '— No linked contract —' },
                      ...contracts.map(c => ({ value: String(c.contractId), label: `${c.contractNumber} (${c.title}) - ${formatCurrency(c.contractValue, profile?.currency || currency)}` }))
                    ]}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Issue Date
                  </label>
                  <Input
                    type="date"
                    value={newInvoiceIssueDate}
                    onChange={e => setNewInvoiceIssueDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={newInvoiceDueDate}
                    onChange={e => setNewInvoiceDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Notes
                </label>
                <Input
                  value={newInvoiceNotes}
                  onChange={e => setNewInvoiceNotes(e.target.value)}
                  placeholder="Notes shown on invoice..."
                />
              </div>

              <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-color)' }}>
                <span>Grand Total (incl. Tax):</span>
                <strong style={{ color: '#10b981', fontSize: '1.15rem' }}>
                  {formatCurrency(newInvoiceAmount + (newInvoiceAmount * (newInvoiceTaxRate / 100)), profile?.currency || currency, 2)}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button type="button" variant="ghost" onClick={() => setShowCreateInvoiceModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={creatingInvoice} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}>
                  {creatingInvoice ? 'Generating…' : 'Generate Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div className="crm-modal-overlay">
          <div className="crm-modal-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
                  color: '#10b981',
                  padding: '0.5rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex'
                }}>
                  <Pencil size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Edit Invoice ({editingInvoice.invoiceNumber})
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Modify invoice line amounts and schedule
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditInvoiceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Invoice Amount ({profile?.currency || currency}) *
                    </label>
                    {currentQuotedTotal > 0 && Math.abs(editInvoiceAmount - currentQuotedTotal) > 0.01 && (
                      <button
                        type="button"
                        onClick={() => setEditInvoiceAmount(currentQuotedTotal)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                      >
                        ⚡ Use Quoted Total ({formatCurrency(currentQuotedTotal, profile?.currency || currency)})
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editInvoiceAmount}
                    onChange={e => setEditInvoiceAmount(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Tax Rate (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editInvoiceTaxRate}
                    onChange={e => setEditInvoiceTaxRate(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Invoice Status
                </label>
                <SelectDown
                  value={editInvoiceStatus}
                  onChange={val => setEditInvoiceStatus(String(val))}
                  options={[
                    { value: 'Draft', label: 'Draft' },
                    { value: 'Sent', label: 'Sent / Issued' },
                    { value: 'Paid', label: 'Paid' },
                    { value: 'Overdue', label: 'Overdue' },
                    { value: 'Void', label: 'Void' }
                  ]}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Issue Date
                  </label>
                  <Input
                    type="date"
                    value={editInvoiceIssueDate}
                    onChange={e => setEditInvoiceIssueDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={editInvoiceDueDate}
                    onChange={e => setEditInvoiceDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Notes
                </label>
                <Input
                  value={editInvoiceNotes}
                  onChange={e => setEditInvoiceNotes(e.target.value)}
                  placeholder="Notes shown on invoice..."
                />
              </div>

              <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-color)' }}>
                <span>Calculated Total (incl. Tax):</span>
                <strong style={{ color: '#10b981', fontSize: '1.15rem' }}>
                  {formatCurrency(editInvoiceAmount + (editInvoiceAmount * (editInvoiceTaxRate / 100)), profile?.currency || currency, 2)}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button type="button" variant="ghost" onClick={() => setEditingInvoice(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={savingInvoice} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}>
                  {savingInvoice ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD / VERIFY CUSTOMER PAYMENT MODAL */}
      {payingInvoice && (() => {
        const remainingBal = payingInvoice.balanceDue ?? (payingInvoice.status === 'Paid' ? 0 : (payingInvoice.totalAmount || payingInvoice.amount));
        const isBankMethod = paymentMethod === 'Bank Transfer' || paymentMethod === 'Check' || paymentMethod === 'SWIFT Wire Transfer';

        return (
          <div className="crm-modal-overlay">
            <div className="crm-modal-container" style={{ maxWidth: '580px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    padding: '0.5rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex'
                  }}>
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Record Offline / Manual Payment
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Invoice #{payingInvoice.invoiceNumber} · Internal Ledger Verification
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Internal Verification Notice */}
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.2rem', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🛡️</span>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Direct Ledger Credit:</strong> Record that the <strong>Customer (Payer)</strong> has made a verified offline payment to <strong>Our Company (Receiver)</strong>.
                </div>
              </div>

              {/* Payer vs Receiver Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>👤 Payer (Customer)</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '0.92rem' }}>
                    {payingInvoice.customerName || (opportunity ? `${opportunity.customerFirstName} ${opportunity.customerLastName}` : 'Customer')}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {payingInvoice.companyName || payingInvoice.customerEmail || opportunity?.customerEmail}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>🏢 Receiver (Our Company)</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '0.92rem' }}>Enterprise CRM Solutions</div>
                  <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>Balance Due: ${remainingBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {/* Payment Method Quick Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                    Payment Method / Channel *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    {[
                      { id: 'Bank Transfer', label: '🏦 Bank Wire' },
                      { id: 'Cash', label: '💵 Cash' },
                      { id: 'Check', label: '📑 Cheque' },
                      { id: 'Telebirr / CBE Birr', label: '📱 Telebirr/CBE' },
                      { id: 'Stripe', label: '💳 Card / POS' },
                      { id: 'SWIFT Wire Transfer', label: '🌐 SWIFT Int.' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        style={{
                          padding: '0.45rem 0.5rem',
                          borderRadius: '8px',
                          border: paymentMethod === m.id ? '1.5px solid #10b981' : '1px solid var(--border-color)',
                          background: paymentMethod === m.id ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-secondary)',
                          color: paymentMethod === m.id ? '#10b981' : 'var(--text-secondary)',
                          fontSize: '0.78rem',
                          fontWeight: paymentMethod === m.id ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount & Date with Quick Fill Chips */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Amount Paid ($) *
                    </label>
                    {remainingBal > 0 && (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(remainingBal)}
                          style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Full (${remainingBal.toLocaleString()})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(Math.round((remainingBal / 2) * 100) / 100)}
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          50% (${(remainingBal / 2).toLocaleString()})
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="crm-form-2col">
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={remainingBal > 0 ? remainingBal : (payingInvoice.totalAmount || payingInvoice.amount)}
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(Number(e.target.value))}
                        required
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Input
                        type="date"
                        value={paymentDate}
                        onChange={e => setPaymentDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {isBankMethod && (
                  <div>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Receiving / Customer Bank Name
                    </label>
                    <SearchableSelect
                      value={paymentBankName}
                      onChange={val => setPaymentBankName(String(val))}
                      options={[
                        { value: 'Commercial Bank of Ethiopia (Nigd Bank)', label: 'Commercial Bank of Ethiopia (Nigd Bank)' },
                        { value: 'Awash Bank', label: 'Awash Bank' },
                        { value: 'Bank of Abyssinia', label: 'Bank of Abyssinia' },
                        { value: 'Dashen Bank', label: 'Dashen Bank' },
                        { value: 'Nib International Bank', label: 'Nib International Bank' },
                        { value: 'Zemen Bank', label: 'Zemen Bank' },
                        { value: 'United Bank / Hibret Bank', label: 'United Bank / Hibret Bank' },
                        { value: 'Cooperative Bank of Oromia', label: 'Cooperative Bank of Oromia' },
                        { value: 'Telebirr / Ethio Telecom', label: 'Telebirr / Ethio Telecom' },
                        { value: 'Other Supported Bank', label: 'Other Supported Bank' }
                      ]}
                    />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Transaction / Slip / Check Reference (Optional)
                  </label>
                  <Input
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                    placeholder="e.g. Bank Deposit Slip #TXN-928374, Check #4092, or Telebirr ID"
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Accounting Remarks / Verification Notes
                    </label>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      {['Direct Bank Deposit', 'Cash in Office', 'Verified on Statement'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setPaymentNotes(tag)}
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Deposit payment / Verified against bank statement"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <Button type="button" variant="ghost" onClick={() => setPayingInvoice(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={processingPayment} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}>
                    <CheckCircle2 size={16} style={{ marginRight: 6 }} /> {processingPayment ? 'Recording…' : 'Confirm & Verify Payment'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Contract View & E-Signature Modal */}
      {selectedContractForModal && (
        <ContractModal
          contract={selectedContractForModal}
          onClose={() => setSelectedContractForModal(null)}
          onUpdate={() => {
            loadData();
            setSelectedContractForModal(null);
          }}
          onInvoice={(contract) => {
            handleOpenCreateInvoice(contract);
            setSelectedContractForModal(null);
          }}
        />
      )}
    </Layout>
  );
};
