# Nexus ERP Cloud

Build a complete production-ready multi-tenant SaaS ERP called “Nexus ERP”.

IMPORTANT:

This must be a REAL FUNCTIONAL APPLICATION, not a visual prototype or demo. All authentication, database operations, permissions, CRUD operations, business rules, tenant isolation, dashboards and workflows must actually work.

TECH STACK:

Use a modern production-ready architecture suitable for Lovable, with Supabase/PostgreSQL for database, authentication and backend services when appropriate.

Use secure server-side validation and Row Level Security (RLS).

Never rely only on frontend permissions.

==================================================

1. PRODUCT

==================================================

Product name: Nexus ERP

Purpose:

A professional ERP for small, medium and large companies.

The system must support:

- Sales

- Customers

- Products

- Inventory

- Purchases

- Suppliers

- Cash Flow

- Accounts Payable

- Accounts Receivable

- Reports

- Employees/users

- Permissions

- Company settings

- Audit logs

- Dashboard

- Help Center / Tutorials

The application must be scalable and structured so new modules can be added later.

==================================================

2. MULTI-TENANT ARCHITECTURE

==================================================

The system must be strictly multi-tenant.

There are two levels:

LEVEL 1 — NEXUS PLATFORM

Nexus Owner / Super Admin manages the entire SaaS.

LEVEL 2 — CUSTOMER COMPANIES

Each customer company has its own isolated environment.

Every company must have a unique company_id.

Every company-related database record must contain company_id.

Users must NEVER be able to access another company's data.

Tenant isolation must be enforced at database/backend level using Supabase RLS and server-side authorization.

Never trust company_id sent by the frontend.

==================================================

3. USER TYPES

==================================================

Create these user roles:

NEXUS_OWNER

COMPANY_ADMIN

MANAGER

EMPLOYEE

NEXUS_OWNER:

- Full access to Nexus platform

- Create companies

- Block/suspend companies

- Reactivate companies

- Delete blocked companies permanently

- Create company administrators

- View platform audit logs

- Manage platform settings

- View company information

- Manage subscription/status information

COMPANY_ADMIN:

- Full access to their own company

- Create employees

- Edit employees

- Deactivate employees

- Assign roles

- Assign module permissions

- Manage company settings

- Access all company modules

- Cannot access Nexus Owner area

- Cannot access other companies

MANAGER:

- Access only authorized modules

- Cannot manage Nexus platform

- Cannot access other companies

EMPLOYEE:

- Access only modules and actions explicitly authorized

- Cannot access administration unless permission is granted

==================================================

4. AUTHENTICATION

==================================================

DO NOT create public registration.

There must NOT be a public:

- Sign Up

- Create Account

- Register Company

Only Nexus Owner can create customer companies.

Only authorized administrators can create users.

Login must use secure authentication.

Include:

- Login

- Logout

- Forgot password

- Password reset

- Session persistence

- Protected routes

==================================================

5. COMPANY CREATION

==================================================

Nexus Owner can create a company.

Company fields:

- Company name

- Legal name

- CNPJ

- Email

- Phone

- Address

- City

- State

- ZIP code

- Status

- Creation date

When creating a company, Nexus Owner must also be able to create the initial Company Administrator.

Administrator fields:

- Full name

- Email

- Phone

- Role

The system automatically generates a secure random temporary password.

After creation, show:

“Temporary password generated”

with a COPY button.

The temporary password must be displayed only at creation time.

Never store or display plaintext passwords in the database.

==================================================

6. FIRST LOGIN

==================================================

When a user logs in using a temporary password:

Force the user to change the password before accessing the ERP.

Show a password-change screen/modal.

Fields:

- New password

- Confirm password

After successfully changing the password:

- Mark temporary password as used

- Require the new permanent password for future logins

- Redirect user to the appropriate dashboard

==================================================

7. EMPLOYEE MANAGEMENT

==================================================

Company administrators can create employees.

Employee fields:

- Name

- Email

- Phone

- CPF

- Position

- Department

- Role

- Status

Generate a temporary password automatically.

Allow administrator to copy the temporary password.

Employee must change password on first login.

Administrators can:

- Create

- Edit

- Deactivate

- Reactivate

- Change role

- Change permissions

- Reset temporary credentials

Never expose passwords.

==================================================

8. PERMISSIONS SYSTEM

==================================================

Create a granular permission system.

Permissions should support:

VIEW

CREATE

EDIT

DELETE

Modules:

Dashboard

Sales

Customers

Products

Inventory

Purchases

Suppliers

Finance

Accounts Payable

Accounts Receivable

Reports

Employees

Users

Company Settings

Example:

Sales:

- View

- Create

- Edit

- Delete

Inventory:

- View

- Create

- Edit

- Delete

Permissions must be enforced both:

1. Frontend

2. Backend/database

If a user does not have permission, the API/database must reject the operation even if they manually modify a request.

==================================================

9. NEXUS ADMIN

==================================================

Create a separate Nexus Administration area.

Navigation:

Dashboard

Companies

Users

Audit Logs

Plans

Settings

Companies page:

Show:

- Company name

- CNPJ

- Administrator

- Status

- Creation date

- Number of users

- Last activity

Actions:

- View

- Edit

- Suspend

- Reactivate

- Delete

IMPORTANT:

Permanent deletion is only allowed for companies that are already BLOCKED/SUSPENDED.

Before permanent deletion require confirmation by typing the company name.

Deleting a company must delete all related tenant data safely and consistently.

Only NEXUS_OWNER can permanently delete companies.

Every suspension, reactivation and deletion must be recorded in audit logs.

==================================================

10. COMPANY STATUS

==================================================

Company statuses:

ACTIVE

SUSPENDED

BLOCKED

If a company is suspended or blocked:

All users belonging to that company must be prevented from accessing the ERP.

Show a clear message:

“Your company is currently suspended or blocked. Please contact Nexus Support.”

Nexus Owner can reactivate the company.

==================================================

11. ERP DASHBOARD

==================================================

Create a professional dashboard.

Show:

- Total sales

- Revenue

- Expenses

- Net cash flow

- Accounts receivable

- Accounts payable

- Low-stock products

- Recent sales

- Recent purchases

- Pending payments

- Monthly revenue chart

- Monthly expenses chart

- Sales chart

- Inventory alerts

Dashboard data must come from the real database.

Do not use fake/demo statistics.

==================================================

12. SALES

==================================================

Create a complete sales module.

Features:

- Create sale

- Edit sale

- Cancel sale

- View sale

- Search sales

- Filter by date

- Filter by customer

- Filter by status

Sale fields:

- Customer

- Products

- Quantity

- Unit price

- Discount

- Subtotal

- Total

- Payment method

- Date

- Seller

- Status

Automatically update inventory when a sale is completed.

Record the financial transaction when applicable.

==================================================

13. CUSTOMERS

==================================================

CRUD customer management.

Fields:

- Name

- CPF/CNPJ

- Email

- Phone

- Address

- City

- State

- ZIP code

- Notes

Include:

- Search

- Filters

- Customer details

- Purchase history

- Financial history

==================================================

14. PRODUCTS

==================================================

Product management.

Fields:

- Name

- SKU

- Barcode

- Category

- Cost price

- Sale price

- Stock quantity

- Minimum stock

- Unit

- Supplier

- Description

- Status

Features:

- Create

- Edit

- Delete

- Search

- Filter

- Stock alerts

==================================================

15. INVENTORY

==================================================

Create real inventory management.

Features:

- Stock entry

- Stock exit

- Manual adjustment

- Inventory history

- Low-stock alerts

- Product movement history

Every movement must record:

- Product

- Quantity

- Type

- User

- Date

- Reason

- Company

Never allow stock manipulation without recording the movement.

==================================================

16. PURCHASES

==================================================

Create purchase management.

Fields:

- Supplier

- Products

- Quantities

- Cost

- Total

- Payment method

- Date

- Status

Completed purchases should increase inventory.

==================================================

17. SUPPLIERS

==================================================

CRUD supplier management.

Fields:

- Company/name

- CNPJ/CPF

- Email

- Phone

- Address

- Notes

Include purchase history.

==================================================

18. FINANCE

==================================================

Create a real financial module.

Include:

Cash Flow

Accounts Payable

Accounts Receivable

Cash Flow:

- Income

- Expenses

- Categories

- Date

- Description

- Amount

- Payment method

- Status

Accounts Payable:

- Supplier

- Description

- Amount

- Due date

- Status

- Payment date

Accounts Receivable:

- Customer

- Description

- Amount

- Due date

- Status

- Receipt date

Automatically update financial status when transactions are completed.

==================================================

19. REPORTS

==================================================

Create reports using real database information.

Reports:

- Sales

- Revenue

- Expenses

- Profit

- Cash flow

- Inventory

- Purchases

- Accounts payable

- Accounts receivable

- Customers

- Products

Include:

- Date filters

- Company filters where appropriate

- Search

- Export to CSV/PDF if technically supported

==================================================

20. AUDIT LOGS

==================================================

Create a complete audit system.

Record:

- User

- Company

- Date/time

- Action

- Module

- Record affected

- Previous value when appropriate

- New value when appropriate

- IP/device information when safely available

Never record passwords.

Examples:

USER_CREATED

USER_DEACTIVATED

SALE_CREATED

SALE_UPDATED

SALE_CANCELLED

PRODUCT_CREATED

STOCK_UPDATED

COMPANY_SUSPENDED

COMPANY_REACTIVATED

COMPANY_DELETED

PERMISSION_CHANGED

PASSWORD_CHANGED

Nexus Owner can see platform audit logs.

Company administrators can see audit logs related to their company according to permissions.

==================================================

21. HELP CENTER / TUTORIAL

==================================================

Create a Help Center inside the ERP.

Navigation:

“Ajuda / Tutorial”

Include tutorials for:

- Getting started

- Dashboard

- Sales

- Customers

- Products

- Inventory

- Purchases

- Suppliers

- Finance

- Reports

- Users

- Permissions

- Company settings

Each tutorial should contain:

- Title

- Explanation

- Step-by-step instructions

- Examples

- Tips

Include search.

Content should support:

PT-BR

English

Spanish

==================================================

22. INTERNATIONALIZATION

==================================================

The entire application must support:

Português Brasil

English

Español

Create a language selector.

Do NOT hardcode UI strings.

All buttons, menus, messages, errors, labels and system notifications must use translation keys.

Default language:

Português Brasil.

==================================================

23. UI/UX

==================================================

Create a professional SaaS ERP interface.

Design principles:

- Clean

- Modern

- Professional

- Responsive

- Fast

- Easy to understand

- Desktop-first but mobile responsive

Create:

Sidebar navigation

Top navigation

User profile menu

Notifications

Breadcrumbs

Tables

Filters

Search

Modals

Forms

Confirmation dialogs

Toast notifications

Loading states

Empty states

Error states

Use consistent Nexus ERP branding.

Do not make the application look like a generic template.

==================================================

24. SECURITY

==================================================

Security is critical.

Implement:

- Supabase authentication

- Row Level Security

- Tenant isolation

- Server-side authorization

- Role-based access control

- Permission checks

- Protected routes

- Secure password handling

- Input validation

- Database constraints

- Protection against unauthorized company_id manipulation

A user must NEVER be able to access another company's information by changing:

- URL

- IDs

- API requests

- frontend state

- database queries

==================================================

25. DATABASE

==================================================

Create a properly normalized PostgreSQL database.

Suggested tables:

companies

users

roles

permissions

user_roles

role_permissions

customers

suppliers

products

categories

inventory_movements

sales

sale_items

purchases

purchase_items

cash_transactions

accounts_payable

accounts_receivable

audit_logs

notifications

tutorials

system_settings

Add appropriate:

- Primary keys

- Foreign keys

- Indexes

- Unique constraints

- Timestamps

- company_id relationships

Use UUIDs where appropriate.

==================================================

26. DATA INTEGRITY

==================================================

Never create fake data automatically for production.

If demo/testing data is needed, make it explicitly optional.

All dashboards and reports must use real database records.

Transactions must be atomic where necessary.

For example:

Completing a sale should:

1. Create sale

2. Create sale items

3. Decrease inventory

4. Create financial transaction if applicable

5. Create audit log

If one step fails, prevent inconsistent partial transactions.

==================================================

27. ERROR HANDLING

==================================================

Create professional error messages.

Examples:

Unauthorized:

“You do not have permission to perform this action.”

Company blocked:

“Your company is currently suspended or blocked. Please contact Nexus Support.”

Invalid login:

“Email or password is incorrect.”

Validation errors must clearly identify the problem.

Never expose database errors, SQL errors, stack traces or sensitive information to users.

==================================================

28. RESPONSIVE DESIGN

==================================================

Desktop:

Full sidebar + dashboard.

Tablet:

Responsive navigation.

Mobile:

Collapsible sidebar and mobile-friendly tables/forms.

==================================================

29. IMPORTANT PRODUCT RULES

==================================================

DO NOT:

- Create public registration

- Use fake authentication

- Use fake dashboard numbers

- Use fake APIs

- Store plaintext passwords

- Allow users to choose arbitrary company_id

- Allow cross-company access

- Put authorization only in frontend

- Create demo-only buttons

- Create non-functional CRUD interfaces

EVERY visible feature must either work or clearly be marked as unavailable.

==================================================

30. DEVELOPMENT APPROACH

==================================================

Build the application in a modular and maintainable way.

Prioritize:

1. Database architecture

2. Authentication

3. Multi-tenant isolation

4. Roles and permissions

5. Nexus Owner administration

6. Company administration

7. Core ERP modules

8. Dashboard

9. Reports

10. Help Center

11. Internationalization

12. UI polish

Before considering the project complete, test:

- Nexus Owner login

- Company creation

- Administrator creation

- Temporary password generation

- First login

- Mandatory password change

- Company login

- Employee creation

- Permission assignment

- Permission enforcement

- Company suspension

- Company reactivation

- Company deletion

- CRUD operations

- Inventory updates

- Sales

- Purchases

- Finance

- Audit logs

- Password reset

- Logout

- Multi-tenant isolation

The final result must be a functional production-ready SaaS ERP foundation called Nexus ERP, designed for real companies and future commercial deployment.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a97b17a2-d62b-4263-8b56-fec01464b558).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
