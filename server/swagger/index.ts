import swaggerUi from 'swagger-ui-express';
import openapiSpecification from './swagger';

// swagger文档注册路由，之后在app.ts中获取，执行函数
export default (app: any) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification));
};