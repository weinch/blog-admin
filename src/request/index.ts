/**
 * axios封装
 * 请求拦截、响应拦截、错误统一处理
 */
import axios from 'axios';
import router from '@/router';
import { ElMessage } from 'element-plus';
import { CHANGE_NETWORK, LOGIN_SUCCESS } from '@/store/mutation-types';
import store from '@/store';

/**
 * 提示函数
 * 禁止点击蒙层、显示一秒后关闭
 */
const message = (message: string) => {
    ElMessage({
        message: message,
        duration: 1000,
    });
};

/**
 * 跳转登录页
 * 携带当前页面路由，以期在登录页面完成登录后返回当前页面
 */
const toLogin = () => {
    // 不会向history里面添加新的记录
    router.replace({
        path: '/login',
        query: {
            // 当前路由路径
            redirect: router.currentRoute.value.fullPath,
        },
    });
};

// 创建axios实例
const instance = axios.create({
    // timeout: 1000 * 5,
    baseURL: '/api',
});

// 设置post请求头
// instance.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
instance.defaults.headers.post['Content-Type'] = 'application/json';

/**
 * 请求拦截器
 * 每次请求前，如果存在token则在请求头中携带token
 */
instance.interceptors.request.use(
    (config) => {
        // 登录流程控制中，根据本地是否存在token判断用户的登录情况
        // 但是即使token存在，也有可能token是过期的，所以在每次的请求头中携带token
        // 后台根据携带的token判断用户的登录情况，并返回给我们对应的状态码
        // 而后我们可以在响应拦截器中，根据状态码进行一些统一的操作。
        // const token = store.getters.getToken;
        // token && (config.headers.common['Authorization'] = token);
        return config;
    },
    (error) => Promise.reject(error)
);

// 响应拦截器
instance.interceptors.response.use(
    // 请求成功
    (response) => (response.status === 200 ? Promise.resolve(response) : Promise.reject(response)),
    // 请求失败
    (error) => {
        const { response } = error;
        if (response) {
            // 请求已发出，但是不在2xx的范围
            errorHandle(response.status, response.data.message);
            return Promise.reject(response);
        } else {
            // 处理断网的情况
            // eg:请求超时或断网时，更新state的network状态
            // network状态在app.vue中控制着一个全局的断网提示组件的显示隐藏
            // 关于断网组件中的刷新重新获取数据，会在断网组件中说明
            if (!window.navigator.onLine) {
                store.commit(CHANGE_NETWORK, false);
            } else {
                return Promise.reject(error);
            }
        }
    }
);

/**
 * 请求失败后的错误统一处理
 * @param {Number} status 请求失败的状态码
 * @param msg
 */
const errorHandle = (status: number, msg: string) => {
    // 状态码判断
    switch (status) {
        // 401: 未登录状态，跳转登录页
        case 401:
            toLogin();
            break;
        // 403 token过期
        // 清除token并跳转登录页
        case 403:
            message('登录过期，请重新登录');
            localStorage.removeItem('token');
            store.commit(LOGIN_SUCCESS, false);
            setTimeout(() => {
                toLogin();
            }, 1000);
            break;
        // 404请求不存在
        case 404:
            message('请求的资源不存在');
            break;
        default:
            console.log(msg);
    }
};

export default instance;
