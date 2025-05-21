;; SME Support Agent - Invoice System
;; A smart contract for creating, tracking, and verifying invoice payments for small businesses

;; Error codes
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_INVOICE_NOT_FOUND (err u101))
(define-constant ERR_ALREADY_PAID (err u102))
(define-constant ERR_INVALID_AMOUNT (err u103))
(define-constant ERR_PAYMENT_TOO_SMALL (err u104))

;; Data structures
(define-map invoices
  { invoice-id: uint }
  {
    business-owner: principal,
    customer: principal,
    amount: uint,
    description: (string-utf8 256),
    due-date: uint,
    paid: bool,
    payment-tx: (optional (buff 32)),
    created-at: uint
  }
)

(define-map business-invoices
  { business-owner: principal }
  { invoice-count: uint }
)

;; Invoice counter
(define-data-var next-invoice-id uint u1)

;; Read-only functions

;; Get invoice details
(define-read-only (get-invoice (invoice-id uint))
  (map-get? invoices { invoice-id: invoice-id })
)

;; Get business invoice count
(define-read-only (get-business-invoice-count (business-owner principal))
  (default-to { invoice-count: u0 } (map-get? business-invoices { business-owner: business-owner }))
)

;; Check if invoice exists
(define-read-only (invoice-exists (invoice-id uint))
  (is-some (map-get? invoices { invoice-id: invoice-id }))
)

;; Check if invoice is paid
(define-read-only (is-invoice-paid (invoice-id uint))
  (match (map-get? invoices { invoice-id: invoice-id })
    invoice (get paid invoice)
    false
  )
)

;; Public functions

;; Create a new invoice
(define-public (create-invoice 
    (customer principal) 
    (amount uint) 
    (description (string-utf8 256)) 
    (due-date uint))
  (let
    (
      (business-owner tx-sender)
      (invoice-id (var-get next-invoice-id))
      (current-time stacks-block-height)
      (business-data (get-business-invoice-count business-owner))
    )
    ;; Validate inputs
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= due-date current-time) ERR_INVALID_AMOUNT)
    
    ;; Create the invoice
    (map-set invoices
      { invoice-id: invoice-id }
      {
        business-owner: business-owner,
        customer: customer,
        amount: amount,
        description: description,
        due-date: due-date,
        paid: false,
        payment-tx: none,
        created-at: current-time
      }
    )
    
    ;; Update the business invoice count
    (map-set business-invoices
      { business-owner: business-owner }
      { invoice-count: (+ (get invoice-count business-data) u1) }
    )
    
    ;; Increment the invoice ID counter
    (var-set next-invoice-id (+ invoice-id u1))
    
    ;; Return the invoice ID
    (ok invoice-id)
  )
)

;; Mark an invoice as paid (by the business owner)
(define-public (mark-invoice-paid (invoice-id uint) (payment-tx (optional (buff 32))))
  (let
    (
      (invoice (unwrap! (map-get? invoices { invoice-id: invoice-id }) ERR_INVOICE_NOT_FOUND))
    )
    ;; Check that the caller is the business owner
    (asserts! (is-eq tx-sender (get business-owner invoice)) ERR_UNAUTHORIZED)
    
    ;; Check that the invoice is not already paid
    (asserts! (not (get paid invoice)) ERR_ALREADY_PAID)
    
    ;; Update the invoice
    (map-set invoices
      { invoice-id: invoice-id }
      (merge invoice { 
        paid: true,
        payment-tx: payment-tx
      })
    )
    
    (ok true)
  )
)

;; Pay an invoice (by the customer)
;; This function would typically involve a token transfer, but for simplicity
;; we're just marking it as paid with a record of the transaction
(define-public (pay-invoice (invoice-id uint) (payment-tx (buff 32)))
  (let
    (
      (invoice (unwrap! (map-get? invoices { invoice-id: invoice-id }) ERR_INVOICE_NOT_FOUND))
    )
    ;; Check that the caller is the customer
    (asserts! (is-eq tx-sender (get customer invoice)) ERR_UNAUTHORIZED)
    
    ;; Check that the invoice is not already paid
    (asserts! (not (get paid invoice)) ERR_ALREADY_PAID)
    
    ;; Update the invoice
    (map-set invoices
      { invoice-id: invoice-id }
      (merge invoice { 
        paid: true,
        payment-tx: (some payment-tx)
      })
    )
    
    (ok true)
  )
)

;; Cancel an invoice (by the business owner)
(define-public (cancel-invoice (invoice-id uint))
  (let
    (
      (invoice (unwrap! (map-get? invoices { invoice-id: invoice-id }) ERR_INVOICE_NOT_FOUND))
    )
    ;; Check that the caller is the business owner
    (asserts! (is-eq tx-sender (get business-owner invoice)) ERR_UNAUTHORIZED)
    
    ;; Check that the invoice is not already paid
    (asserts! (not (get paid invoice)) ERR_ALREADY_PAID)
    
    ;; Delete the invoice
    (map-delete invoices { invoice-id: invoice-id })
    
    (ok true)
  )
)
