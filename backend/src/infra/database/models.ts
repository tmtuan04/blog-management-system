import { CategoryTranslation } from '../../modules/categories/models/category-translation.model';
import { Category } from '../../modules/categories/models/category.model';
import { Comment } from '../../modules/comments/models/comment.model';
import { Language } from '../../modules/languages/models/language.model';
import { PageTranslation } from '../../modules/pages/models/page-translation.model';
import { Page } from '../../modules/pages/models/page.model';
import { PostTranslation } from '../../modules/posts/models/post-translation.model';
import { Post } from '../../modules/posts/models/post.model';
import { UiTranslation } from '../../modules/ui-translations/models/ui-translation.model';
import { OauthAccount } from '../../modules/users/models/oauth-account.model';
import { Role } from '../../modules/users/models/role.model';
import { User } from '../../modules/users/models/user.model';

/** 12 bảng theo database.dbml. Schema chỉ đổi qua migration, không dùng sync. */
export const MODELS = [
  Role,
  User,
  OauthAccount,
  Language,
  Category,
  CategoryTranslation,
  Post,
  PostTranslation,
  Comment,
  UiTranslation,
  Page,
  PageTranslation,
];
