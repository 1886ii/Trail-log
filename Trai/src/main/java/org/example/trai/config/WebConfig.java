package org.example.trai.config;

import jakarta.annotation.Resource;
import org.example.trai.interceptor.AdminLoginInterceptor;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Duration;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Resource
    private UserLoginInterceptor userLoginInterceptor;
    @Resource
    private AdminLoginInterceptor adminLoginInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(userLoginInterceptor)
                .addPathPatterns("/user/**")
                .excludePathPatterns(
                        "/user/post/list",
                        "/user/login",
                        "/", "/index.html", "/favicon.ico",
                        "/assets/**", "/media/**",
                        "/error"                       // ← 别漏，否则错误页本身被 401 再拦一次
                );
        registry.addInterceptor(adminLoginInterceptor)
                .addPathPatterns("/admin/**")
                .excludePathPatterns(
                        "/admin/login",
                        "/", "/index.html", "/favicon.ico",
                        "/assets/**", "/media/**",
                        "/error"                       // ← 别漏，否则错误页本身被 401 再拦一次
                );

    }


    @Value("${trai.media.save_photo_path}")
    private String savePhotoPath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/media/**")
                .addResourceLocations("file:" + savePhotoPath)
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(30)));
    }
}