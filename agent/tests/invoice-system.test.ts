import { Clarinet, Tx, type Chain, type Account, types } from "https://deno.land/x/clarinet@v1.0.5/index.ts"
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts"

const CONTRACT_NAME = "invoice-system"

Clarinet.test({
  name: "Ensure that business owner can create an invoice",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!
    const customer = accounts.get("wallet_1")!

    // Create an invoice
    const block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_NAME,
        "create-invoice",
        [
          types.principal(customer.address),
          types.uint(1000), // amount
          types.utf8("Web development services"), // description
          types.uint(30), // due date (30 blocks from now)
        ],
        deployer.address,
      ),
    ])

    // Check the result
    assertEquals(block.receipts.length, 1)
    assertEquals(block.height, 2)
    assertEquals(block.receipts[0].result, "(ok u1)") // First invoice ID should be 1
  },
})

Clarinet.test({
  name: "Ensure that invoice details can be retrieved",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!
    const customer = accounts.get("wallet_1")!

    // Create an invoice
    const block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_NAME,
        "create-invoice",
        [
          types.principal(customer.address),
          types.uint(1000), // amount
          types.utf8("Web development services"), // description
          types.uint(30), // due date (30 blocks from now)
        ],
        deployer.address,
      ),
    ])

    // Get the invoice details
    const invoiceId = 1
    const result = chain.callReadOnlyFn(CONTRACT_NAME, "get-invoice", [types.uint(invoiceId)], deployer.address)

    // Parse the response
    const invoice = result.result.expectSome().expectTuple()

    // Verify invoice details
    assertEquals(invoice["business-owner"], `'${deployer.address}`)
    assertEquals(invoice["customer"], `'${customer.address}`)
    assertEquals(invoice["amount"], "u1000")
    assertEquals(invoice["description"], '"Web development services"')
    assertEquals(invoice["paid"], "false")
  },
})

Clarinet.test({
  name: "Ensure that business owner can mark an invoice as paid",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!
    const customer = accounts.get("wallet_1")!

    // Create an invoice
    chain.mineBlock([
      Tx.contractCall(
        CONTRACT_NAME,
        "create-invoice",
        [
          types.principal(customer.address),
          types.uint(1000), // amount
          types.utf8("Web development services"), // description
          types.uint(30), // due date (30 blocks from now)
        ],
        deployer.address,
      ),
    ])

    // Mark the invoice as paid
    const invoiceId = 1
    const block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_NAME,
        "mark-invoice-paid",
        [
          types.uint(invoiceId),
          types.none(), // no payment transaction
        ],
        deployer.address,
      ),
    ])

    // Check the result
    assertEquals(block.receipts.length, 1)
    assertEquals(block.receipts[0].result, "(ok true)")

    // Verify the invoice is now marked as paid
    const result = chain.callReadOnlyFn(CONTRACT_NAME, "is-invoice-paid", [types.uint(invoiceId)], deployer.address)

    assertEquals(result.result, "true")
  },
})

Clarinet.test({
  name: "Ensure that customer can pay an invoice",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!
    const customer = accounts.get("wallet_1")!

    // Create an invoice
    chain.mineBlock([
      Tx.contractCall(
        CONTRACT_NAME,
        "create-invoice",
        [
          types.principal(customer.address),
          types.uint(1000), // amount
          types.utf8("Web development services"), // description
          types.uint(30), // due date (30 blocks from now)
        ],
        deployer.address,
      ),
    ])

    // Pay the invoice
    const invoiceId = 1
    const fakeTxId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

    const block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, "pay-invoice", [types.uint(invoiceId), types.buff(fakeTxId)], customer.address),
    ])

    // Check the result
    assertEquals(block.receipts.length, 1)
    assertEquals(block.receipts[0].result, "(ok true)")

    // Verify the invoice is now marked as paid
    const result = chain.callReadOnlyFn(CONTRACT_NAME, "is-invoice-paid", [types.uint(invoiceId)], deployer.address)

    assertEquals(result.result, "true")
  },
})

Clarinet.test({
  name: "Ensure that unauthorized users cannot mark invoices as paid",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!
    const customer = accounts.get("wallet_1")!
    const unauthorized = accounts.get("wallet_2")!

    // Create an invoice
    chain.mineBlock([
      Tx.contractCall(
        CONTRACT_NAME,
        "create-invoice",
        [
          types.principal(customer.address),
          types.uint(1000), // amount
          types.utf8("Web development services"), // description
          types.uint(30), // due date (30 blocks from now)
        ],
        deployer.address,
      ),
    ])

    // Try to mark the invoice as paid with an unauthorized account
    const invoiceId = 1
    const block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_NAME,
        "mark-invoice-paid",
        [
          types.uint(invoiceId),
          types.none(), // no payment transaction
        ],
        unauthorized.address,
      ),
    ])

    // Check the result - should be an error
    assertEquals(block.receipts.length, 1)
    assertEquals(block.receipts[0].result, "(err u100)") // ERR_UNAUTHORIZED
  },
})

Clarinet.test({
  name: "Ensure that business owner can cancel an unpaid invoice",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!
    const customer = accounts.get("wallet_1")!

    // Create an invoice
    chain.mineBlock([
      Tx.contractCall(
        CONTRACT_NAME,
        "create-invoice",
        [
          types.principal(customer.address),
          types.uint(1000), // amount
          types.utf8("Web development services"), // description
          types.uint(30), // due date (30 blocks from now)
        ],
        deployer.address,
      ),
    ])

    // Cancel the invoice
    const invoiceId = 1
    const block = chain.mineBlock([
      Tx.contractCall(CONTRACT_NAME, "cancel-invoice", [types.uint(invoiceId)], deployer.address),
    ])

    // Check the result
    assertEquals(block.receipts.length, 1)
    assertEquals(block.receipts[0].result, "(ok true)")

    // Verify the invoice no longer exists
    const result = chain.callReadOnlyFn(CONTRACT_NAME, "invoice-exists", [types.uint(invoiceId)], deployer.address)

    assertEquals(result.result, "false")
  },
})
