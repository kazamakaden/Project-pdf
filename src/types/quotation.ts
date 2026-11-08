export interface CustomerInfo {
  contactName: string;
  organization: string;
  address: string;
  taxId: string;
}

export interface QuotationMeta {
  quotationNo: string;
  issueDate: string;
  validUntil: string;
  reference: string;
  note: string;
}

export interface QuotationTotals {
  subtotal: number;
  vat: number;
  grandTotal: number;
  includeVat: boolean;
  vatRate: number;
}