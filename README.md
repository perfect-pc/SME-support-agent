# SME-support-agent - Blockchain-Powered Business Assistant

# Invoice System Feature

## Overview

The Invoice System is the first core feature of the SME Support Agent platform. It provides small businesses with a blockchain-based solution for creating, tracking, and verifying payments for invoices. This feature leverages the immutability and transparency of blockchain technology to ensure secure and verifiable business transactions.

## Key Functionality

The Invoice System smart contract (`invoice-system.clar`) implements the following functionality:

### 1. Invoice Creation
- Business owners can create detailed invoices for their customers
- Each invoice includes amount, description, due date, and customer information
- Invoices are stored on the blockchain with a unique ID

### 2. Invoice Management
- Business owners can view all their created invoices
- Invoices can be marked as paid by the business owner
- Unpaid invoices can be canceled if needed

### 3. Payment Verification
- Customers can pay invoices and record the transaction on the blockchain
- Payment transactions are linked to specific invoices
- The payment status of invoices can be verified by all parties

### 4. Business Analytics
- Business owners can track their invoice count
- The system maintains a history of all invoice activities

## Technical Implementation

The smart contract is implemented in Clarity, the smart contract language for the Stacks blockchain. It uses:

- **Maps** for storing invoice data and business statistics
- **Data variables** for maintaining invoice IDs
- **Read-only functions** for querying invoice information
- **Public functions** for creating and managing invoices

## How to Use

### For Business Owners

1. **Create an Invoice**:
   Call the `create-invoice` function with customer information, amount, description, and due date.

2. **Mark an Invoice as Paid**:
   When payment is received outside the blockchain, call `mark-invoice-paid` with the invoice ID.

3. **Cancel an Invoice**:
   If an invoice needs to be canceled, call `cancel-invoice` with the invoice ID.

### For Customers

1. **Pay an Invoice**:
   Call the `pay-invoice` function with the invoice ID and transaction information.

2. **View Invoice Details**:
   Use the `get-invoice` function to view details of an invoice.

## Testing

The feature includes comprehensive tests in the `invoice-system_test.ts` file, which verify:

- Invoice creation functionality
- Retrieval of invoice details
- Payment processing
- Authorization controls
- Invoice cancellation

## Future Enhancements

In future iterations, this feature will be expanded to include:

1. Integration with cryptocurrency payment systems
2. Automated payment reminders
3. Invoice templates
4. Multi-currency support
5. Integration with the bookkeeping feature

## Security Considerations

The smart contract implements several security measures:

- Authorization checks to ensure only authorized parties can modify invoices
- Validation of input parameters
- Error handling for various edge cases
