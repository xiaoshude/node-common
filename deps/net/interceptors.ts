import { AxiosRequestConfig, AxiosResponse } from 'axios';
import 'url';
import fs from 'fs-extra';
import crypto from 'crypto';

/**
 * response 的 config 在请求前后，会存在字符串级别的不一致，所以，仅提取其中几个关键字段 hash
 * @param {AxiosRequestConfig} config
 * @returns {string}
 */
export function getHashFromConfig(config: AxiosRequestConfig): string {
  const pure = {
    url: config.url,
    params: config.params,
    cookie: config.headers?.cookie,
    data: config.data,
  };
  const strData = JSON.stringify(pure);
  // 对 config 求 hash
  const hash = crypto.createHash('md5').update(strData)
    .digest('hex');
  return hash;
}
const ext = '.json';
export function getFilePathFromConfig(config: AxiosRequestConfig): string {
  const { url } = config;
  const urlObj = new URL(url as string);
  const { host } = urlObj;
  const filePath = `${defaultFilePath}${host}${ext}`;
  return filePath;
}
const defaultFilePath = `${process.cwd()}/deps/net/`;
export const requestInterceptor = async (config: AxiosRequestConfig) => {
  // log the request config before request is sent
  const { url, method } = config;
  const urlObj = new URL(url as string);
  const { pathname } = urlObj;
  const filePath = getFilePathFromConfig(config);
  try {
    await fs.ensureFile(filePath);
    const rawCurrentContent = await fs.readFile(filePath, 'utf8');
    let currentContent = {};
    try {
      if (rawCurrentContent) {
        currentContent = JSON.parse(rawCurrentContent);
      }
    } catch (e) {
      console.error(`JSON.parse ${filePath} error, use empty object`, e);
    }
    if (!currentContent[pathname]) {
      currentContent[pathname] = {};
    }
    if (!currentContent[pathname][method as string]) {
      currentContent[pathname][method as string] = {};
    }
    const hash = getHashFromConfig(config);
    if (!currentContent[pathname][method as string][hash]) {
      currentContent[pathname][method as string][hash] = {};
    }
    // force update
    currentContent[pathname][method as string][hash].request = config;
    await fs.writeJSON(filePath, currentContent);
    console.debug('requestInterceptor end', url);
  } catch (e) {
    console.error('deps/net requestInterceptor error', e);
  }
  return config;
};

export const responseInterceptor = async (response: AxiosResponse) => {
  // log the request config before request is sent
  const { config } = response;
  const { url, method } = config;
  console.debug('responseInterceptor start', url);
  const urlObj = new URL(url as string);
  const { host, pathname } = urlObj;
  const filePath = `${defaultFilePath}${host}${ext}`;
  try {
    await fs.ensureFile(filePath);
    const rawCurrentContent = await fs.readFile(filePath, 'utf8');
    let currentContent = {};
    try {
      if (rawCurrentContent) {
        currentContent = JSON.parse(rawCurrentContent);
      }
    } catch (e) {
      console.error(`JSON.parse ${filePath} error, use empty object`, e);
    }
    if (!currentContent[pathname]) {
      currentContent[pathname] = {};
    }
    if (!currentContent[pathname][method as string]) {
      currentContent[pathname][method as string] = {};
    }

    const hash = getHashFromConfig(config);
    // force update
    if (!currentContent[pathname][method as string][hash]) {
      currentContent[pathname][method as string][hash] = {};
    }
    currentContent[pathname][method as string][hash].response = response.data;
    await fs.writeJSON(filePath, currentContent);
  } catch (e) {
    console.error('deps/net responseInterceptor error', e);
  }
  console.debug('responseInterceptor end', url);
  return response;
};

