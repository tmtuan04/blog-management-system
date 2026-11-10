import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { UploadModule } from '../../infra/upload/upload.module';

import { Category } from '../categories/models/category.model';
import { CategoryTranslation } from '../categories/models/category-translation.model';
import { Language } from '../languages/models/language.model';

import { AdminPostsController } from './admin-posts.controller';
import { AdminPostsService } from './admin-posts.service';
import { PostsService } from './posts.service';

import { PostTranslation } from './models/post-translation.model';
import { Post } from './models/post.model';
import { PostsController } from './posts.controller';
@Module({
  imports: [
    SequelizeModule.forFeature([
      Post,
      PostTranslation,
      Language,
      Category,
      CategoryTranslation,
    ]),
    UploadModule,
  ],
  controllers: [AdminPostsController, PostsController],
  providers: [AdminPostsService, PostsService],
})
export class PostsModule {}
