package org.example.trai.controller.admin;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.DTO.UserAddDTO;
import org.example.trai.entity.VO.UserAddVO;
import org.example.trai.service.UserService;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/user")
public class AdminUserController {

    @Resource
    private UserService userService;

    @PostMapping("/add")
    public Return<UserAddVO> addUser(@RequestBody UserAddDTO userAddDTO) {
        if (userAddDTO == null) return Return.fail(null, Codes.FAIL_NORMAL);
        if (userAddDTO.getGrade() == null || userAddDTO.getGrade() <=0
                || userAddDTO.getGrade() >= 30 || !StringUtils.hasLength(userAddDTO.getAccount())
                || userAddDTO.getUserAccess() < 0 || userAddDTO.getUserAccess() >= 4) return Return.fail(null, Codes.FAIL_NORMAL);


        String password = userService.addUser(userAddDTO);

        return password != null ? Return.success(new UserAddVO(password), Codes.SUCCESS_NORMAL) : Return.fail(null, Codes.FAIL_NORMAL);
    }
}
