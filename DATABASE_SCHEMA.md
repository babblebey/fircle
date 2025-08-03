# Database Schema Documentation

## Updated Models Overview

The Fircle app now uses a more sophisticated database schema with three main models: **Member**, **User**, and **Post**. This design allows for flexible family management where family members can exist in the system before they create user accounts.

## 📊 Database Models

### 1. Member Model
Represents a person in the family system.

```prisma
model Member {
  id        String   @id @default(cuid())
  name      String
  email     String?  @unique // Optional - members can exist without accounts
  birthDate DateTime?
  avatar    String?  // Profile picture URL
  bio       String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relationships
  user      User?    @relation("MemberUser") // Optional one-to-one
  taggedIn  PostMember[] // Many-to-many with Post
  
  @@map("members")
}
```

**Key Features:**
- ✅ Can exist without a user account (unclaimed members)
- ✅ Optional email field
- ✅ Can be tagged in posts even without an account
- ✅ Rich profile information (bio, avatar, birth date)

### 2. User Model
Represents an account that can log into the system.

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String?  @unique
  password  String?  // Optional for OAuth users
  provider  String?  // OAuth provider (google, facebook, etc.)
  providerId String? // OAuth provider ID
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relationships
  memberId  String   @unique // Required - every user links to a member
  member    Member   @relation("MemberUser")
  posts     Post[]   @relation("UserPosts")
  
  @@map("users")
}
```

**Key Features:**
- ✅ Always linked to one member record
- ✅ Supports OAuth authentication (Google, Facebook, etc.)
- ✅ Can claim existing member profiles
- ✅ Authors posts in the system

### 3. Post Model
Represents shared family content.

```prisma
model Post {
  id        String   @id @default(cuid())
  title     String?
  content   String
  imageUrls String[] // Array of image URLs
  videoUrls String[] // Array of video URLs
  isPublic  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relationships
  authorId  String
  author    User     @relation("UserPosts")
  taggedMembers PostMember[] // Many-to-many with Member
  
  @@map("posts")
}
```

**Key Features:**
- ✅ Rich content support (text, images, videos)
- ✅ Public/private visibility control
- ✅ Tag multiple family members
- ✅ Authored by users, tags members

### 4. PostMember Junction Table
Handles the many-to-many relationship between Posts and Members.

```prisma
model PostMember {
  id       String @id @default(cuid())
  postId   String
  memberId String
  
  post     Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  member   Member @relation(fields: [memberId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@unique([postId, memberId]) // Prevent duplicate tags
  @@map("post_members")
}
```

## 🔗 Relationship Diagram

```
Member (1) ←→ (0..1) User
   ↑                   ↓
   │                   │
   │              (1) Posts (*)
   │                   │
   └── (PostMember) ←──┘
        Many-to-Many
```

## 🧠 Key Use Cases

### 1. Unclaimed Member Workflow
1. Add "Grandma Rose" as a member without account
2. Tag Grandma Rose in birthday posts
3. Later, Rose signs up and claims her member profile
4. Rose can now see all historical posts where she was tagged

### 2. Post Tagging System
- Users create posts and tag family members (not other users)
- Tagged members receive notifications if they have accounts
- Members without accounts are still trackable in the system

### 3. Account Management
- Users must be linked to a member to use the app
- Multiple signup methods: direct registration or claiming existing member
- Member profiles persist independently of user accounts

## 🚀 Migration from FamilyMember

The old `FamilyMember` model has been replaced with the new `Member` model. The system maintains backward compatibility during the transition period.

### What Changed:
- `FamilyMember` → `Member` (with enhanced fields)
- Added `User` model for authentication
- Added `Post` model for content sharing
- Added `PostMember` junction table for tagging

### Migration Steps:
1. Run `npm run db:push` to create new tables
2. Migrate existing family member data to new Member table
3. Update frontend components to use new API endpoints
4. Remove old FamilyMember references when ready

## 📡 API Endpoints

### Member Routes (`api.member.*`)
- `getAll()` - Get all members with user and post data
- `getById(id)` - Get member by ID
- `create(data)` - Create new member
- `update(id, data)` - Update member
- `delete(id)` - Delete member
- `getUnclaimed()` - Get members without user accounts

### User Routes (`api.user.*`)
- `getAll()` - Get all users with member and post data
- `getById(id)` - Get user by ID
- `getByEmail(email)` - Get user by email
- `create(data)` - Create new user
- `claimMember(data)` - Link user to existing member
- `update(id, data)` - Update user
- `delete(id)` - Delete user

### Post Routes (`api.post.*`)
- `getAll()` - Get all posts with author and tagged members
- `getById(id)` - Get post by ID
- `getByAuthor(authorId)` - Get posts by author
- `getByTaggedMember(memberId)` - Get posts where member is tagged
- `create(data)` - Create new post with member tags
- `update(id, data)` - Update post and member tags
- `delete(id)` - Delete post

## 🎯 Best Practices

1. **Always create Members first** - Users should claim existing members when possible
2. **Tag Members, not Users** - Posts tag member profiles, not user accounts
3. **Handle optional relationships** - Check if member has user account before user-specific operations
4. **Use transactions** - When creating users that claim members, use database transactions
5. **Validate uniqueness** - Ensure email uniqueness across both Member and User models
