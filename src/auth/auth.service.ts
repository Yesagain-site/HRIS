import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Role, RoleDocument } from './schemas/role.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema'; 
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { BulkCreateUsersDto } from './dto/bulk-create-users.dto'; 

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>, // ✅ NEW INJECTION
    private jwtService: JwtService,
  ) {}

  // ============ AUTH METHODS ============

  async validateUser(username: string, password: string) {
    const user = await this.userModel.findOne({ username }).populate('role');
    if (user && user.isActive) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        const userObject = user.toObject();
        const { password: _, ...result } = userObject;
        return {
          ...result,
          id: result._id.toString(),
          _id: result._id.toString(),
          role: result.role ? {
            ...result.role,
            id: result.role._id.toString(),
            _id: result.role._id.toString()
          } : null
        };
      }
    }
    return null;
  }

  async login(user: any) {
    const payload = { 
      username: user.username, 
      sub: user._id, 
      role: user.role,
      email: user.email,
      employeeId: user.employeeId
    };
    
    await this.userModel.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId
      }
    };
  }

  // ============ ROLE MANAGEMENT ============

  async createRole(dto: CreateRoleDto, userId: string) {
    const existingRole = await this.roleModel.findOne({ name: dto.name });
    if (existingRole) {
      throw new ConflictException(`Role with name "${dto.name}" already exists`);
    }

    const role = new this.roleModel({
      ...dto,
      createdBy: userId,
      isSystem: dto.isSystem || false
    });

    const saved = await role.save();
    return {
      ...saved.toObject(),
      id: saved._id.toString(),
      _id: saved._id.toString()
    };
  }

  async updateRole(id: string, dto: UpdateRoleDto, userId: string) {
    const role = await this.roleModel.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('Cannot modify system roles');
    }

    if (dto.name && dto.name !== role.name) {
      const existing = await this.roleModel.findOne({ name: dto.name });
      if (existing) {
        throw new ConflictException(`Role with name "${dto.name}" already exists`);
      }
    }

    const updated = await this.roleModel.findByIdAndUpdate(
      id,
      {
        ...dto,
        updatedBy: userId,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException('Role not found after update');
    }

    return {
      ...updated.toObject(),
      id: updated._id.toString(),
      _id: updated._id.toString()
    };
  }

  async deleteRole(id: string) {
    const role = await this.roleModel.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    const usersWithRole = await this.userModel.countDocuments({ role: new Types.ObjectId(id) });
    if (usersWithRole > 0) {
      throw new BadRequestException(`Cannot delete role that is assigned to ${usersWithRole} user(s)`);
    }

    await this.roleModel.findByIdAndDelete(id);
    return { message: 'Role deleted successfully' };
  }

  async findAllRoles() {
    const roles = await this.roleModel.find().sort({ name: 1 });
    return roles.map(role => ({
      ...role.toObject(),
      id: role._id.toString(),
      _id: role._id.toString()
    }));
  }

  async findRoleById(id: string) {
    const role = await this.roleModel.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return {
      ...role.toObject(),
      id: role._id.toString(),
      _id: role._id.toString()
    };
  }

  // ============ USER MANAGEMENT ============

  async createUser(dto: CreateUserDto, userId: string) {
    const existingUsername = await this.userModel.findOne({ username: dto.username });
    if (existingUsername) {
      throw new ConflictException(`Username "${dto.username}" already exists`);
    }

    // ✅ Changed: Only check email if provided
    if (dto.email) {
      const existingEmail = await this.userModel.findOne({ email: dto.email });
      if (existingEmail) {
        throw new ConflictException(`Email "${dto.email}" already exists`);
      }
    }

    const role = await this.roleModel.findById(dto.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = new this.userModel({
      username: dto.username,
      password: hashedPassword,
      email: dto.email,
      role: new Types.ObjectId(dto.roleId),
      employeeId: dto.employeeId ? new Types.ObjectId(dto.employeeId) : undefined,
      isActive: dto.isActive ?? true,
      createdBy: userId
    });

    const saved = await user.save();
    const populatedUser = await this.userModel.findById(saved._id).populate('role');

    if (!populatedUser) {
      throw new NotFoundException('User not found after creation');
    }

    const userObject = populatedUser.toObject();
    const { password: _, ...result } = userObject;

    return {
      ...result,
      id: saved._id.toString(),
      _id: saved._id.toString(),
      role: result.role ? {
        ...result.role,
        id: result.role._id.toString(),
        _id: result.role._id.toString()
      } : null
    };
  }

  // ============ ✅ NEW: BULK USER CREATION ============
  async bulkCreateUsers(dto: BulkCreateUsersDto, userId: string) {
    console.log('🚀 Starting bulk user creation...');
    console.log('📦 Received dto:', JSON.stringify(dto, null, 2));
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as { employeeId: string; reason: string }[],
      created: [] as any[]
    };

    // Get the Employee role (or use provided roleId)
    let roleId: string;
    if (dto.roleId) {
      const role = await this.roleModel.findById(dto.roleId);
      if (!role) {
        throw new NotFoundException('Role not found');
      }
      roleId = dto.roleId;
    } else {
      const employeeRole = await this.roleModel.findOne({ name: 'Employee' });
      if (!employeeRole) {
        throw new NotFoundException('Employee role not found. Please create an "Employee" role first.');
      }
      roleId = employeeRole._id.toString();
    }

    console.log(`✅ Using role ID: ${roleId}`);

    // Process each user in the bulk request
    for (const userItem of dto.users) {
      try {
        // Ensure employeeId exists
        if (!userItem.employeeId) {
          results.failed++;
          results.errors.push({
            employeeId: 'undefined',
            reason: 'Employee ID is missing'
          });
          continue;
        }

        console.log(`🔍 Processing employee ID: ${userItem.employeeId} (type: ${typeof userItem.employeeId})`);
        
        // ✅ FIXED: Properly type the employeeDocument variable
        let employeeDocument: EmployeeDocument | null = null;
        
        // First, try to find by _id if it's a valid ObjectId
        if (Types.ObjectId.isValid(userItem.employeeId)) {
          try {
            employeeDocument = await this.employeeModel.findById(userItem.employeeId);
            if (employeeDocument) {
              console.log(`✅ Found employee by _id: ${employeeDocument._id}`);
            }
          } catch (err) {
            console.log(`⚠️ Error finding by _id: ${err.message}`);
          }
        }
        
        // If not found by _id, try to find by staffId
        if (!employeeDocument) {
          console.log(`🔍 Trying to find by staffId: ${userItem.employeeId}`);
          employeeDocument = await this.employeeModel.findOne({ 
            staffId: userItem.employeeId 
          });
          
          if (employeeDocument) {
            console.log(`✅ Found employee by staffId: ${employeeDocument._id}`);
          }
        }

        // If still not found, try to find by other fields
        if (!employeeDocument) {
          console.log(`🔍 Trying to find by email or other fields...`);
          // Try to find by email if it looks like an email
          if (userItem.employeeId.includes('@')) {
            employeeDocument = await this.employeeModel.findOne({ 
              email: userItem.employeeId 
            });
          }
        }

        // If no employee found, log error and continue
        if (!employeeDocument) {
          console.log(`❌ No employee found for ID: ${userItem.employeeId}`);
          results.failed++;
          results.errors.push({
            employeeId: String(userItem.employeeId),
            reason: 'Employee not found'
          });
          continue;
        }

        // Check if employee already has a user account
        const existingUser = await this.userModel.findOne({ 
          employeeId: employeeDocument._id 
        });
        
        if (existingUser) {
          console.log(`❌ User already exists for employee: ${employeeDocument._id}`);
          results.failed++;
          results.errors.push({
            employeeId: String(userItem.employeeId),
            reason: 'User account already exists for this employee'
          });
          continue;
        }

        // Generate username from staffId or fallback
        const username = employeeDocument.staffId || 
                        `EMP${employeeDocument._id.toString().substring(0, 8)}`;

        // Check if username already exists
        const existingUsername = await this.userModel.findOne({ username });
        if (existingUsername) {
          console.log(`❌ Username already exists: ${username}`);
          results.failed++;
          results.errors.push({
            employeeId: String(userItem.employeeId),
            reason: `Username "${username}" already exists`
          });
          continue;
        }

        // Check if email exists (if employee has email)
        if (employeeDocument.email) {
          const existingEmail = await this.userModel.findOne({ 
            email: employeeDocument.email 
          });
          if (existingEmail) {
            console.log(`❌ Email already exists: ${employeeDocument.email}`);
            results.failed++;
            results.errors.push({
              employeeId: String(userItem.employeeId),
              reason: `Email "${employeeDocument.email}" already exists`
            });
            continue;
          }
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(userItem.password, 10);

        // Create the user
        const user = new this.userModel({
          username,
          password: hashedPassword,
          email: employeeDocument.email || undefined,
          role: new Types.ObjectId(roleId),
          employeeId: employeeDocument._id,
          isActive: true,
          createdBy: userId
        });

        const saved = await user.save();
        const populatedUser = await this.userModel.findById(saved._id).populate('role');

        if (populatedUser) {
          const userObject = populatedUser.toObject();
          const { password: _, ...result } = userObject;

          results.created.push({
            ...result,
            id: saved._id.toString(),
            _id: saved._id.toString(),
            role: result.role ? {
              ...result.role,
              id: result.role._id.toString(),
              _id: result.role._id.toString()
            } : null
          });
          results.success++;
          console.log(`✅ Successfully created user for: ${employeeDocument.firstName} ${employeeDocument.lastName}`);
        }
      } catch (error: any) {
        console.error(`❌ Error processing employee ${userItem.employeeId}:`, error);
        results.failed++;
        results.errors.push({
          employeeId: String(userItem.employeeId),
          reason: error.message || 'Unknown error'
        });
      }
    }

    console.log(`📊 Bulk creation complete: ${results.success} success, ${results.failed} failed`);
    return results;
  }

  async updateUser(id: string, dto: UpdateUserDto, userId: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.username && dto.username !== user.username) {
      const existing = await this.userModel.findOne({ username: dto.username });
      if (existing) {
        throw new ConflictException(`Username "${dto.username}" already exists`);
      }
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userModel.findOne({ email: dto.email });
      if (existing) {
        throw new ConflictException(`Email "${dto.email}" already exists`);
      }
    }

    const updateData: any = { 
      ...dto, 
      updatedBy: userId, 
      updatedAt: new Date() 
    };
    
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }
    
    if (dto.roleId) {
      updateData.role = new Types.ObjectId(dto.roleId);
      delete updateData.roleId;
    }
    
    if (dto.employeeId) {
      updateData.employeeId = new Types.ObjectId(dto.employeeId);
    }

    const updated = await this.userModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('role');

    if (!updated) {
      throw new NotFoundException('User not found after update');
    }

    const userObject = updated.toObject();
    const { password: _, ...result } = userObject;

    return {
      ...result,
      id: updated._id.toString(),
      _id: updated._id.toString(),
      role: result.role ? {
        ...result.role,
        id: result.role._id.toString(),
        _id: result.role._id.toString()
      } : null
    };
  }

  async deleteUser(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const adminRole = await this.roleModel.findOne({ name: 'Admin' });
    if (adminRole && user.role.toString() === adminRole._id.toString()) {
      const adminCount = await this.userModel.countDocuments({ role: adminRole._id });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot delete the last admin user');
      }
    }

    await this.userModel.findByIdAndDelete(id);
    return { message: 'User deleted successfully' };
  }

  async findAllUsers() {
    const users = await this.userModel.find()
      .populate('role')
      .sort({ username: 1 });
    
    return users.map(user => {
      const userObject = user.toObject();
      const { password: _, ...result } = userObject;
      
      return {
        ...result,
        id: user._id.toString(),
        _id: user._id.toString(),
        role: result.role ? {
          ...result.role,
          id: result.role._id.toString(),
          _id: result.role._id.toString()
        } : null
      };
    });
  }

  async findUserById(id: string) {
    const user = await this.userModel.findById(id).populate('role');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userObject = user.toObject();
    const { password: _, ...result } = userObject;

    return {
      ...result,
      id: user._id.toString(),
      _id: user._id.toString(),
      role: result.role ? {
        ...result.role,
        id: result.role._id.toString(),
        _id: result.role._id.toString()
      } : null
    };
  }
}