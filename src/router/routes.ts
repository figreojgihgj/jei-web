import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'item/:keyHash/:tab?', component: () => import('pages/IndexPage.vue') },
    ],
  },

  {
    path: '/editor',
    component: () => import('layouts/EditorLayout.vue'),
    children: [
      { path: '', component: () => import('pages/editor/DashboardPage.vue') },
      { path: 'items', component: () => import('pages/editor/ItemEditorPage.vue') },
      { path: 'types', component: () => import('pages/editor/RecipeTypeEditorPage.vue') },
      { path: 'recipes', component: () => import('pages/editor/RecipeEditorPage.vue') },
      { path: 'tags', component: () => import('pages/editor/TagEditorPage.vue') },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
