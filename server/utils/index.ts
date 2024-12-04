import fs from 'fs';
import path from 'path';

const filePath = path.join(__dirname, '../../tmp/db/data.json');

/**
 * 写入键值对数据到文件
 * 
 */
export function writeDataToFile(data: { [key: string]: string[] }) {
  try {
    // 文件不存在，创建文件
    if(!fs.existsSync(filePath)) {
      // 创建文件
      fs.writeFileSync(filePath, '', 'utf8');
    }

    // 存在的数据需要进行合并
    let existingData = {};
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      existingData = JSON.parse(fileContent);
    }

    // 合并数据
    const updatedData = { ...existingData, ...data };

    // 将对象转换为 JSON 字符串, null - 不进行函数预处理； 2 - 每行缩进空格
    const jsonData = JSON.stringify(updatedData, null, 2);
    fs.writeFileSync(filePath, jsonData, 'utf8');
  } catch (error) {
    console.error('写入文件时发生错误:', error);
  }
}

/**
 * 从文件读取数据并返回键值对对象
 * 
 */
export function readDataFromFile(): { [key: string]: string[] } | undefined {
  try {
    // 文件不存在
    if (!fs.existsSync(filePath)) {
      console.log('文件不存在，将返回空对象');
      return {};
    }

    // 读取文件内容
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('读取文件时发生错误:', error);
  }
}

/**
 * 根据键名删除文件中的键值对
 * 
 */
export function deleteDataFromFile(key: string) {
  try {
    if(!fs.existsSync(filePath)) {
      console.log('文件不存在，无法删除');
      return ;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    let existingData = JSON.parse(fileContent);

    if(existingData.hasOwnProperty(key)) {
      delete existingData[key];

      // 更新后的数据写入文件
      const jsonData = JSON.stringify(existingData, null, 2);
      fs.writeFileSync(filePath, jsonData, 'utf8');
    } else {
      console.log(`键 "${key}" 不存在，无法删除`);
    }

  } catch (error) {
    console.error('删除文件时发生错误:', error);
  }
}