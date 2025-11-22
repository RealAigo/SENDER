# Authentication System

This application now includes secure authentication using JWT (JSON Web Tokens) tokens and bcrypt password hashing.

## Features

- ✅ **User Registration**: Create new user accounts
- ✅ **User Login**: Secure login with email and password
- ✅ **JWT Tokens**: Secure token-based authentication
- ✅ **Password Hashing**: Passwords are hashed using bcrypt before storage
- ✅ **Protected Routes**: All API routes (except auth) require authentication
- ✅ **User-Specific Data**: Campaigns are associated with users
- ✅ **Session Management**: Tokens stored in localStorage

## Database Schema

### Users Table

The authentication system requires a `users` table in the database:

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Campaigns Table Update

The `campaigns` table has been updated to include `user_id`:

```sql
ALTER TABLE campaigns 
ADD COLUMN user_id INT NULL,
ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
```

## Environment Variables

Add the following environment variable to your backend `.env` file:

```env
# JWT Secret Key (change this to a random string in production)
JWT_SECRET=your-secret-key-change-in-production

# Optional: JWT expiration time (default: 7d)
JWT_EXPIRES_IN=7d
```

### Generate JWT Secret

Generate a secure random string for `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important**: Use a strong, random secret key in production!

## API Endpoints

### Public Endpoints (No Authentication Required)

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Protected Endpoints (Authentication Required)

All other endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Auth Endpoints

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

#### Verify Token

```http
GET /api/auth/verify
Authorization: Bearer <token>
```

Response:
```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

## Frontend Authentication

The frontend uses React Context for authentication state management:

- **AuthProvider**: Provides authentication state and methods
- **useAuth Hook**: Access authentication state in components
- **ProtectedRoute**: Component to protect routes that require authentication
- **Login/Register Pages**: User authentication UI

### Using Authentication in Components

```javascript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please login</div>;
  }
  
  return (
    <div>
      <p>Welcome, {user.username}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Security Features

1. **Password Hashing**: Passwords are hashed using bcrypt with 10 salt rounds
2. **JWT Tokens**: Secure token-based authentication with expiration
3. **Token Validation**: All protected routes validate tokens before processing
4. **User Isolation**: Users can only see and manage their own campaigns
5. **Secure Headers**: Tokens sent via Authorization header
6. **Automatic Logout**: Frontend automatically redirects to login on 401/403 errors

## Migration for Existing Databases

If you have an existing database, run the migration script:

```bash
mysql -u root -p email_sender < database/migration_auth.sql
```

Or manually add the users table and update campaigns table as shown in the Database Schema section above.

## Password Requirements

- Minimum length: 6 characters
- No maximum length enforced (but recommended to keep reasonable)
- Passwords are case-sensitive

## User Roles

Currently supported roles:
- `user` (default): Regular user with full access to their own campaigns
- `admin`: Admin user (for future role-based access control)

## Troubleshooting

### "Access token required" error

- Make sure you're logged in
- Check if token exists in localStorage: `localStorage.getItem('token')`
- Clear localStorage and login again if token is expired

### "Invalid token" error

- Token may be expired (default: 7 days)
- Token may be corrupted
- Clear localStorage and login again

### Cannot register/login

- Check database connection
- Verify users table exists
- Check backend logs for errors
- Ensure JWT_SECRET is set in .env


