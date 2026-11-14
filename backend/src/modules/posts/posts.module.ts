import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UploadModule } from '../../infra/upload/upload.module';
import { CategoryTranslation } from '../categories/models/category-translation.model';
import { Category } from '../categories/models/category.model';
import { LanguagesModule } from '../languages/languages.module';
import { Language } from '../languages/models/language.model';
import { AdminPostsController } from './admin-posts.controller';
import { AdminPostsService } from './admin-posts.service';
import { PostTranslation } from './models/post-translation.model';
import { Post } from './models/post.model';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [
    // Model được @InjectModel trong service
    SequelizeModule.forFeature([
      Post,
      PostTranslation,
      Language,
      Category,
      CategoryTranslation,
    ]),
    // UploadService: kiểm tra file thumbnail
    UploadModule,
    // LanguagesService: ngôn ngữ mặc định (có cache) để lấy tên danh mục dự phòng
    LanguagesModule,
  ],
  controllers: [AdminPostsController, PostsController],
  providers: [AdminPostsService, PostsService],
  // C2 dùng PostsService.findCards cho GET /categories/:slug/posts
  exports: [PostsService],
})
export class PostsModule {}
