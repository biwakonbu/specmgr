# Ubiquitous Language Guide

## Overview
Ubiquitous Language is a shared vocabulary between developers, domain experts, and stakeholders. It ensures everyone speaks the same language when discussing the system.

## Why Ubiquitous Language Matters

1. **Eliminates Translation**: No mental translation between business terms and code
2. **Reduces Ambiguity**: Everyone understands exactly what "Account" or "Order" means
3. **Improves Communication**: Meetings and documentation use consistent terminology
4. **Better Code**: Code reflects business concepts directly

## How to Define Ubiquitous Language

### In Domain Feature Documents

Each domain feature document should include a "Ubiquitous Language" section that defines:
- **Terms**: The exact words used in this domain
- **Definitions**: Clear, unambiguous meanings
- **Relationships**: How terms relate to each other
- **States**: Valid states for domain objects
- **Actions**: Verbs that describe domain operations

### Example: E-commerce Order Processing

```markdown
## Ubiquitous Language

### Entities
- **Order**: A customer's request to purchase items
- **Line Item**: A single product and quantity within an order
- **Customer**: Person or organization placing orders
- **Inventory**: Available stock of products

### States
- **Draft Order**: Order being created, not yet submitted
- **Pending Order**: Submitted but not yet paid
- **Confirmed Order**: Paid and ready for fulfillment
- **Shipped Order**: Items sent to customer
- **Delivered Order**: Items received by customer
- **Cancelled Order**: Order terminated before delivery

### Actions
- **Place Order**: Customer submits draft order
- **Confirm Payment**: Payment successfully processed
- **Fulfill Order**: Prepare items for shipping
- **Ship Order**: Hand items to delivery service
- **Cancel Order**: Stop order processing

### Business Rules in Language
- "An Order can only be Cancelled if it's not yet Shipped"
- "Line Items are immutable after Order is Placed"
- "Inventory is Reserved when Order is Confirmed"
```

## Best Practices

### 1. Use Business Terms, Not Technical Terms
❌ Bad: "User Record", "Database Entry", "Transaction Log"
✅ Good: "Customer Account", "Order", "Purchase History"

### 2. Be Consistent Everywhere
- Use the same term in:
  - Documentation
  - Code (classes, methods, variables)
  - Database schemas
  - API endpoints
  - UI labels

### 3. Avoid Synonyms
Pick one term and stick with it:
- ❌ User, Customer, Client, Account Holder
- ✅ Customer (everywhere)

### 4. Define State Transitions Clearly
```
Draft -> Pending -> Confirmed -> Shipped -> Delivered
            ↓           ↓            ↓
        Cancelled   Cancelled    (Cannot cancel)
```

### 5. Include Domain Experts
- Regular reviews with business stakeholders
- Validate terms match real-world usage
- Update when business evolves

## Integration with Oracle System

### AI Understanding
When AI agents read specifications with Ubiquitous Language:
- They understand precise meanings
- Can answer questions using correct terminology
- Avoid misinterpretation of ambiguous terms

### Search Benefits
- Search for "Order" finds all order-related concepts
- No confusion between technical and business terms
- Cross-reference related terms automatically

### Example Query and Response

**Query**: "How do I cancel an order?"

**AI Response using Ubiquitous Language**:
```
Based on the Order Processing specification:

To Cancel an Order:
1. Order must be in Draft, Pending, or Confirmed state
2. Cannot cancel if Order is already Shipped
3. Cancellation releases Reserved Inventory
4. Customer receives cancellation notification

The business rule states: "An Order can only be Cancelled if it's not yet Shipped"
```

## Implementation Enforcement

### Naming Convention Rules

The Oracle system enforces ubiquitous language in code through automated validation:

#### 1. Type/Class Names
```python
# ✅ Good - Uses ubiquitous language
class PendingAccount:
    pass

class OrderLineItem:
    pass

# ❌ Bad - Not in ubiquitous language
class TempUser:  # Should be "Registrant"
    pass

class OrderDetail:  # Should be "LineItem"
    pass
```

#### 2. Variable Names
```python
# ✅ Good
registrant = Registrant(email="user@example.com")
pending_account = Account(status=AccountStatus.PENDING)

# ❌ Bad
temp_user = Registrant(...)  # Wrong term
user_obj = Account(...)      # Generic, not domain-specific
```

#### 3. Database Tables and Columns
```sql
-- ✅ Good - Matches ubiquitous language
CREATE TABLE pending_accounts (
    registrant_email VARCHAR(255),
    verification_token VARCHAR(100),
    activation_date TIMESTAMP
);

-- ❌ Bad - Uses technical/generic terms
CREATE TABLE temp_users (       -- Should be "registrants"
    user_email VARCHAR(255),    -- Should be "registrant_email"
    confirm_token VARCHAR(100), -- Should be "verification_token"
);
```

#### 4. API Endpoints
```
✅ Good:
POST   /api/registrants           # Create registrant
POST   /api/accounts/activate     # Activate account
GET    /api/orders/{id}/line-items

❌ Bad:
POST   /api/users/temp           # Should use "registrants"
POST   /api/users/confirm        # Should use "activate"
GET    /api/orders/{id}/details  # Should use "line-items"
```

### Validation Rules

The Oracle system checks:

1. **Exact Match**: Names must exactly match ubiquitous language terms
2. **Case Conventions**: 
   - Classes: PascalCase (PendingAccount)
   - Variables/functions: snake_case (pending_account)
   - Database: snake_case (pending_accounts)
   - URLs: kebab-case (line-items)

3. **Compound Terms**: Multi-word terms maintain meaning
   - "Line Item" → LineItem, line_item, line-items
   - "Pending Account" → PendingAccount, pending_account

4. **Forbidden Aliases**: Common wrong terms trigger errors
   - User → Should be Customer/Registrant/Account
   - Item → Should be Product/LineItem
   - Transaction → Should be Order/Payment

### Oracle Validation Commands

```bash
# Check file for naming violations
oracle check-naming src/models/user.py

# Validate entire codebase
oracle check-naming --all

# Check database schema
oracle check-naming --db schema.sql

# Check API definitions
oracle check-naming --api openapi.yaml
```

### Example Validation Output

```
Oracle: Naming Convention Validation
====================================
Checking: src/models/order.py

❌ Violations Found:

Line 15: class OrderDetail:
  Error: "OrderDetail" not in ubiquitous language
  Suggestion: Use "LineItem" or "OrderLineItem"
  Reference: order-processing.md#ubiquitous-language

Line 23: temp_customer = Customer(...)
  Warning: Variable "temp_customer" uses non-domain prefix
  Suggestion: Use specific state like "pending_customer"

Line 45: def confirm_transaction(self):
  Error: "transaction" should be "order"
  Reference: order-processing.md#ubiquitous-language

Summary: 2 errors, 1 warning
```

### IDE Integration

Oracle provides plugins for:
- **Real-time validation**: Highlight violations as you type
- **Auto-complete**: Suggest ubiquitous language terms
- **Refactoring**: Rename to match ubiquitous language
- **Documentation**: Show term definitions on hover

## Maintaining Ubiquitous Language

### 1. Regular Reviews
- Quarterly language review meetings
- Include developers, domain experts, and users
- Document any changes

### 2. Language Evolution
- Track when terms change meaning
- Deprecate old terms gracefully
- Update all references systematically

### 3. Cross-Domain Coordination
When terms span multiple domains:
- Define shared understanding
- Note domain-specific variations
- Maintain consistency where possible