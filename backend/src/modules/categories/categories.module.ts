import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { LanguagesModule } from '../languages/languages.module';
import { Language } from '../languages/models/language.model';
import { PostsModule } from '../posts/posts.module';
import { Post } from '../posts/models/post.model';
import { PostTranslation } from '../posts/models/post-translation.model';

import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoriesService } from './admin-categories.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Category } from './models/category.model';
import { CategoryTranslation } from './models/category-translation.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Category,
      CategoryTranslation,
      Language,
      Post,
      PostTranslation,
    ]),
    LanguagesModule,
    PostsModule,
  ],
  controllers: [AdminCategoriesController, CategoriesController],
  providers: [AdminCategoriesService, CategoriesService],
})
export class CategoriesModule {}
