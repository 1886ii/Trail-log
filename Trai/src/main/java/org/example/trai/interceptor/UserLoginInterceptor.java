package org.example.trai.interceptor;

import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.example.trai.common.Common;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.BO.UserSessionBO;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import tools.jackson.databind.ObjectMapper;

@Component
public class UserLoginInterceptor implements HandlerInterceptor {
    private static final ThreadLocal<UserSessionBO> CURRENT_USER= new ThreadLocal<>();

    public static UserSessionBO current() {
        return CURRENT_USER.get();
    }

    @Resource
    private ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        /* ② 两段 if 合并：session 为 null 和 user 为 null 是同一件事 */
        HttpSession session = request.getSession(false);
        UserSessionBO user = (session == null) ? null : (UserSessionBO) session.getAttribute(Common.USER_SESSION_KEY);
        if (user == null) {
            response.setStatus(401);
            response.setContentType("application/json;charset=UTF-8");   // ← 少了这行中文乱码
            objectMapper.writeValue(response.getWriter(), Return.fail(null, Codes.FAIL_NORMAL));
            return false;
        }
        CURRENT_USER.set(user);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        CURRENT_USER.remove();
    }
}
