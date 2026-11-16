import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Language } from '../languages/models/language.model';
import { Post } from '../posts/models/post.model';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoriesService } from './admin-categories.service';
import { CategoryTranslation } from './models/category-translation.model';
import { Category } from './models/category.model';

/** UC15 (admin). Route public UC07 thêm vào module này ở việc C2 */
@Module({
  imports: [
    // Language: kiểm tra mã ngôn ngữ trong `names`. Post: đếm bài theo danh mục
    SequelizeModule.forFeature([Category, CategoryTranslation, Language, Post]),
  ],
  controllers: [AdminCategoriesController],
  providers: [AdminCategoriesService],
})
export class CategoriesModule {}
