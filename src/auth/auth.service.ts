import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Role, RoleDocument } from './schemas/role.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
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

    const existingEmail = await this.userModel.findOne({ email: dto.email });
    if (existingEmail) {
      throw new ConflictException(`Email "${dto.email}" already exists`);
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