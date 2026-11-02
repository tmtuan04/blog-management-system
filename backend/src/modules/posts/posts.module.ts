import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UploadModule } from '../../infra/upload/upload.module';
import { Category } from '../categories/models/category.model';
import { Language } from '../languages/models/language.model';
import { AdminPostsController } from './admin-posts.controller';
import { AdminPostsService } from './admin-posts.service';
import { PostTranslation } from './models/post-translation.model';
import { Post } from './models/post.model';

@Module({
  imports: [
    // Model được @InjectModel trong service
    SequelizeModule.forFeature([Post, PostTranslation, Language, Category]),
    // UploadService: kiểm tra file thumbnail
    UploadModule,
  ],
  controllers: [AdminPostsController],
  providers: [AdminPostsService],
})
export class PostsModule {}
