package org.example.trai.controller.admin;

import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.example.trai.common.Common;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.BO.AdminSessionBO;
import org.example.trai.entity.DTO.AdminLoginDTO;
import org.example.trai.entity.VO.AdminLoginVO;
import org.example.trai.service.AdminService;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
public class AdminController {

    @Resource
    private AdminService adminService;

    @PostMapping("/login")
    public Return<AdminLoginVO> login(@RequestBody AdminLoginDTO adminLoginDTO, HttpServletRequest request) {
        // 1. 参数校验
        if (adminLoginDTO == null) return Return.fail(null, Codes.FAIL_LOGIN);
        if (!StringUtils.hasLength(adminLoginDTO.getAccount())
                || !StringUtils.hasLength(adminLoginDTO.getPassword())) return Return.fail(null, Codes.FAIL_LOGIN);

        // 2. 检查密码
        AdminSessionBO adminSessionBO = adminService.login(adminLoginDTO);
        if (adminSessionBO == null) return Return.fail(null, Codes.FAIL_LOGIN);

        // 3. 存储会话
        HttpSession session = request.getSession();
        request.changeSessionId();
        session.setAttribute(Common.ADMIN_SESSION_KEY, adminSessionBO);

        return Return.success(new AdminLoginVO(adminSessionBO.getAccount()), Codes.SUCCESS_NORMAL);
    }
}
