import express from 'express';
import { json } from 'express';
import cors from 'cors';
import path from 'path';
// swagger
import swaggerSetup from './swagger/index'

// 引入路由模块
import commonUploadRoute from './routes/commonUpload';
import chunkUploadRoute from './routes/chunkUpload';

// express服务
const app = express(); // 获取express实例
app.use(cors()); // 跨域处理
app.use(json()); // 使用中间件来解析JSON格式的请求体
// 服务器配置全局变量
const IP_ADDRESS = '127.0.0.1'
const PORT = 3000;

// 挂载页面服务
app.use('/www', express.static(path.join(__dirname, '../pages')));

// 挂载路由
app.use('/cn', commonUploadRoute); // 普通上传
app.use('/ck', chunkUploadRoute); // 分片上传

// 挂载swagger路由，注意一定要在挂载的路由之后，否则不生效
swaggerSetup(app);

// 监听（启动）服务
app.listen(PORT, IP_ADDRESS, () => {
  console.log(`文件上传服务运行在 http://${IP_ADDRESS}:${PORT}`);
})
