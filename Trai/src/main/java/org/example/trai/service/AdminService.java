package org.example.trai.service;

import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.example.trai.entity.BO.AdminSessionBO;
import org.example.trai.entity.DTO.AdminLoginDTO;
import org.example.trai.entity.PO.AdminPO;
import org.example.trai.mapper.AdminMapper;
import org.example.trai.utils.PasswordUtil;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
public class AdminService {
    @Resource
    private AdminMapper adminMapper;


    public AdminSessionBO login(AdminLoginDTO adminLoginDTO) {
        // 1. 根据信息查询admin
        AdminPO adminPO = adminMapper.queryByAccount(adminLoginDTO.getAccount());
        if (adminPO == null) return null;
        if (!StringUtils.hasLength(adminPO.getPassword())) return null;
        if (!PasswordUtil.matches(adminLoginDTO.getPassword(), adminPO.getPassword())) {
            // 1. 密码错误
            return null;
        }

        int res = adminMapper.updateLoginTime(adminPO.getId());
        if (res == 0) {
            log.info("管理时间更新失败");
        }
        return new AdminSessionBO(adminPO.getId(), adminPO.getAccount());
    }
}
