# Type System Theory - Set-Based Type Definitions

## Overview

Types are fundamentally sets of values. This document defines a set-theoretic approach to type definitions, allowing precise specification of type relationships, subset constraints, and transformation filters.

## Core Concepts

### 1. Types as Sets

Every type represents a set of possible values:

```yaml
types:
  Natural:
    set: "{ x ∈ ℤ | x ≥ 0 }"
    description: "Non-negative integers"
    
  PositiveInteger:
    set: "{ x ∈ ℤ | x > 0 }"
    description: "Positive integers"
    subset_of: Integer
    
  Email:
    set: "{ s ∈ String | s matches RFC5322 }"
    description: "Valid email addresses"
    subset_of: String
```

### 2. Type Relationships

#### Subset Relations (⊆)

```yaml
type_hierarchy:
  # Numeric hierarchy
  Natural ⊆ Integer ⊆ Rational ⊆ Real ⊆ Complex
  PositiveInteger ⊆ Natural
  
  # String hierarchy  
  Email ⊆ String
  URL ⊆ String
  UUID ⊆ String
  
  # Status hierarchy
  ActiveAccountStatus ⊆ AccountStatus
  DraftOrderStatus ⊆ OrderStatus
```

#### Union Types (∪)

```yaml
types:
  StringOrNumber:
    union_of: [String, Number]
    set: "String ∪ Number"
    
  NullableEmail:
    union_of: [Email, Null]
    set: "Email ∪ {null}"
    
  ErrorCode:
    union_of: [SystemError, UserError, ValidationError]
```

#### Intersection Types (∩)

```yaml
types:
  PositiveEvenInteger:
    intersection_of: [PositiveInteger, EvenNumber]
    set: "{ x ∈ ℤ | x > 0 ∧ x mod 2 = 0 }"
    
  SecurePassword:
    intersection_of: [
      MinLength8String,
      ContainsUppercase,
      ContainsLowercase,
      ContainsDigit,
      ContainsSpecialChar
    ]
```

### 3. Type Predicates and Filters

#### Predicate Functions

```yaml
predicates:
  IsPositive:
    input: Number
    condition: "x > 0"
    output: boolean
    
  IsValidEmail:
    input: String
    condition: "matches(x, RFC5322_REGEX)"
    output: boolean
    
  IsBusinessDay:
    input: Date
    condition: "weekday(x) ∈ {Mon, Tue, Wed, Thu, Fri}"
    output: boolean
```

#### Filter Transformations

```yaml
filters:
  ToPositive:
    input: Number
    output: PositiveNumber
    transform: "x => max(x, 0)"
    ensures: "result > 0"
    
  NormalizeEmail:
    input: String
    output: Email
    transform: "x => toLowerCase(trim(x))"
    validates: "IsValidEmail(result)"
    throws: "InvalidEmailError if !IsValidEmail(result)"
    
  ParseDate:
    input: String
    output: Date
    transform: "x => parseISO8601(x)"
    throws: "InvalidDateError if parsing fails"
```

### 4. Dependent Types

Types that depend on runtime values:

```yaml
types:
  BoundedString:
    parameters:
      minLength: Natural
      maxLength: Natural
    constraint: "minLength ≤ maxLength"
    set: "{ s ∈ String | minLength ≤ length(s) ≤ maxLength }"
    
  ModuloInteger:
    parameters:
      n: PositiveInteger
    set: "{ x ∈ ℤ | 0 ≤ x < n }"
    
  ArrayOfLength:
    parameters:
      T: Type
      length: Natural
    set: "{ a ∈ Array<T> | length(a) = length }"
```

### 5. Refinement Types

Types refined by predicates:

```yaml
refinements:
  AdultAge:
    base: Age
    refine: "x ≥ 18"
    set: "{ x ∈ Age | x ≥ 18 }"
    
  PremiumCustomer:
    base: Customer
    refine: "x.totalPurchases > 10000 ∧ x.memberSince < now() - 1year"
    
  ValidCreditCard:
    base: CreditCardNumber
    refine: "luhnCheck(x) ∧ !isExpired(x) ∧ !isBlacklisted(x)"
```

## Advanced Type Definitions

### 1. Algebraic Data Types

```yaml
algebraic_types:
  Result:
    type: sum
    variants:
      Success:
        value: T
      Error:
        error: ErrorType
        
  Tree:
    type: sum
    variants:
      Leaf:
        value: T
      Node:
        left: Tree<T>
        right: Tree<T>
```

### 2. Phantom Types

Types that exist only at specification level:

```yaml
phantom_types:
  Validated:
    phantom: true
    description: "Marks data as validated"
    
  Sanitized:
    phantom: true
    description: "Marks string as sanitized"
    
  # Usage
  ValidatedEmail:
    base: Email
    phantom_tags: [Validated]
```

### 3. Type State Machines

```yaml
type_states:
  Connection:
    states:
      Disconnected:
        transitions:
          connect: Connecting
      Connecting:
        transitions:
          success: Connected
          failure: Disconnected
      Connected:
        transitions:
          disconnect: Disconnected
          error: Disconnected
          
    operations:
      send:
        requires_state: Connected
        input: Message
        output: Result<Unit, SendError>
```

## Type Transformation Pipeline

### 1. Pipeline Definition

```yaml
pipelines:
  UserRegistrationPipeline:
    stages:
      - name: "Parse Input"
        input: RawFormData
        filter: ParseFormData
        output: ParsedFormData
        
      - name: "Validate Email"
        input: ParsedFormData
        filter: ValidateEmail
        output: FormDataWithValidEmail
        
      - name: "Normalize"
        input: FormDataWithValidEmail
        filter: NormalizeUserData
        output: NormalizedUserData
        
      - name: "Create User"
        input: NormalizedUserData
        filter: CreateUserEntity
        output: User
```

### 2. Composition Rules

```yaml
composition:
  # Filter composition: (f ∘ g)(x) = f(g(x))
  EmailNormalizer:
    compose: [Trim, ToLowerCase, ValidateEmail]
    
  # Parallel composition
  ValidateUserInput:
    parallel:
      email: ValidateEmail
      password: ValidatePassword
      age: ValidateAge
```

## Type Variance

### 1. Covariance and Contravariance

```yaml
variance:
  # Covariant (preserves subtyping)
  List:
    parameter: T
    variance: covariant
    rule: "If A ⊆ B, then List<A> ⊆ List<B>"
    
  # Contravariant (reverses subtyping)
  Validator:
    parameter: T
    variance: contravariant
    rule: "If A ⊆ B, then Validator<B> ⊆ Validator<A>"
    
  # Invariant (no subtyping)
  MutableArray:
    parameter: T
    variance: invariant
    rule: "MutableArray<A> and MutableArray<B> are unrelated"
```

## Practical Examples

### 1. Email Processing Pipeline

```yaml
example_email_pipeline:
  # Define the type hierarchy
  types:
    RawInput:
      set: "String"
      
    TrimmedString:
      set: "{ s ∈ String | s = trim(s) }"
      subset_of: String
      
    LowercaseString:
      set: "{ s ∈ String | s = toLowerCase(s) }"
      subset_of: String
      
    NormalizedEmail:
      intersection_of: [Email, TrimmedString, LowercaseString]
      
  # Define filters
  filters:
    TrimWhitespace:
      input: String
      output: TrimmedString
      transform: "s => trim(s)"
      
    ToLowerCase:
      input: String
      output: LowercaseString
      transform: "s => toLowerCase(s)"
      
    ValidateEmailFormat:
      input: String
      output: Email
      validates: "matches(s, EMAIL_REGEX)"
      throws: "InvalidEmailError"
      
  # Compose pipeline
  pipeline:
    EmailNormalization:
      input: RawInput
      stages:
        - TrimWhitespace
        - ToLowerCase
        - ValidateEmailFormat
      output: NormalizedEmail
```

### 2. Age Verification System

```yaml
example_age_verification:
  types:
    BirthDate:
      base: Date
      constraint: "date ≤ today()"
      
    Age:
      base: Natural
      derive_from: BirthDate
      transform: "birthDate => yearsBetween(birthDate, today())"
      
    AdultAge:
      base: Age
      constraint: "age ≥ 18"
      
    SeniorAge:
      base: Age
      constraint: "age ≥ 65"
      
  filters:
    CalculateAge:
      input: BirthDate
      output: Age
      transform: "birthDate => floor(daysBetween(birthDate, today()) / 365.25)"
      
    RequireAdult:
      input: Age
      output: AdultAge
      validates: "age ≥ 18"
      throws: "UnderageError"
      
  predicates:
    IsEligibleForSeniorDiscount:
      input: Age
      condition: "age ≥ 65"
      output: boolean
```

### 3. Financial Amount Types

```yaml
example_financial_types:
  types:
    Currency:
      enum: ["USD", "EUR", "JPY", "GBP"]
      
    MoneyAmount:
      properties:
        amount: Decimal
        currency: Currency
      constraints:
        precision: 2  # for most currencies
        scale: "currency == 'JPY' ? 0 : 2"
        
    PositiveMoney:
      base: MoneyAmount
      constraint: "amount > 0"
      
    Price:
      base: PositiveMoney
      description: "Product price, must be positive"
      
    Discount:
      base: MoneyAmount
      constraint: "0 ≤ amount ≤ originalPrice"
      
  filters:
    ApplyDiscount:
      input: 
        price: Price
        discount: Discount
      output: Price
      validate: "discount.currency == price.currency"
      transform: "{ amount: price.amount - discount.amount, currency: price.currency }"
      ensures: "result.amount ≥ 0"
```

## Type Safety Guarantees

### 1. Compile-Time Guarantees

```yaml
guarantees:
  type_preservation:
    description: "Well-typed programs don't produce type errors"
    formal: "If Γ ⊢ e : T and e →* v, then Γ ⊢ v : T"
    
  progress:
    description: "Well-typed programs don't get stuck"
    formal: "If Γ ⊢ e : T, then either e is a value or ∃e' such that e → e'"
```

### 2. Runtime Validations

```yaml
runtime_checks:
  boundary_validation:
    description: "Validate at system boundaries"
    locations:
      - "API input/output"
      - "Database read/write"
      - "External service calls"
      
  filter_postconditions:
    description: "Verify filter outputs match expected type"
    implementation: "assert output ∈ OutputType"
```

## Oracle Integration

### Type Verification Commands

```bash
# Verify type relationships
oracle verify-types --check-subset "Email ⊆ String"
oracle verify-types --check-union "StringOrNumber = String ∪ Number"

# Verify filter correctness
oracle verify-filter NormalizeEmail --input "TEST@EXAMPLE.COM" --expect "test@example.com"

# Verify type constraints in code
oracle check-types src/models/user.py --spec types.yaml

# Generate type predicates
oracle generate-predicates --from types.yaml --to src/validators/
```

### Example Verification Output

```
Oracle: Type System Verification
================================
Checking: EmailNormalization pipeline

✅ Stage 1: TrimWhitespace
   Input: " user@example.com "
   Output: "user@example.com" ∈ TrimmedString

✅ Stage 2: ToLowerCase  
   Input: "USER@EXAMPLE.COM"
   Output: "user@example.com" ∈ LowercaseString

✅ Stage 3: ValidateEmailFormat
   Input: "user@example.com"
   Output: "user@example.com" ∈ Email

✅ Pipeline output: "user@example.com" ∈ NormalizedEmail
✅ All type constraints satisfied
```

## Best Practices

1. **Define Base Sets First**: Start with fundamental types, then build complex types
2. **Use Algebraic Types**: Compose types using union, intersection, and product
3. **Document Set Membership**: Be explicit about what values belong to each type
4. **Test Edge Cases**: Verify behavior at type boundaries
5. **Fail Fast**: Validate as early as possible in the pipeline
6. **Make Invalid States Unrepresentable**: Use types to prevent invalid data