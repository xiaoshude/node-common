import axios from 'axios';
import { requestInterceptor, responseInterceptor, getHashFromConfig, getFilePathFromConfig } from './interceptors';
import fs from 'fs-extra';
export const request = axios.create();
// 只有记录模式才开始写
if (process.env.RECORD) {
  request.interceptors.request.use(requestInterceptor);
  request.interceptors.response.use(responseInterceptor);
}

export const mockedRequest = axios.create();
// ref: https://stackoverflow.com/questions/62686283/axios-how-to-intercept-and-respond-to-axios-request
mockedRequest.interceptors.request.use((config) => {
  const { url, method } = config;
  console.debug('start mock request', method, url);
  const urlObj = new URL(url as string);
  const { pathname } = urlObj;

  throw {
    isLocal: true,
    hash: getHashFromConfig(config),
    filePath: getFilePathFromConfig(config),
    pathname,
    method,
  }; // <- this will stop request and trigger
  // response error. I want to trigger
  // the actual response callback
});

mockedRequest.interceptors.response.use(
  response => response,
  async (error) => {
    const hash = error?.hash;
    const filePath = error?.filePath;
    const {
      pathname,
      method,
    } = error;
    const rawCurrentContent = await fs.readFile(filePath, 'utf8');
    let currentContent = {};
    try {
      if (rawCurrentContent) {
        currentContent = JSON.parse(rawCurrentContent);
      }
    } catch (e) {
      console.error(`JSON.parse ${filePath} error, use empty object`, e);
    }

    const res =  {
      data: currentContent[pathname][method][hash]?.response,
    };
    console.debug('mock res', res);
    return res;
  }  // <- sends as successful response
  ,
);
