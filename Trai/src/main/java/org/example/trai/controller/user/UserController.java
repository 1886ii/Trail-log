package org.example.trai.controller.user;

import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.example.trai.common.Common;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.BO.UserSessionBO;
import org.example.trai.entity.DTO.UserLoginDTO;
import org.example.trai.entity.DTO.UserUpdateDTO;
import org.example.trai.entity.VO.UserInfoVO;
import org.example.trai.entity.VO.UserLoginVO;
import org.example.trai.service.UserService;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/user")
public class UserController {

    @Resource
    private UserService userService;

    @PostMapping("/login")
    public Return<UserLoginVO> login(@RequestBody UserLoginDTO userLoginDTO, HttpServletRequest request) {
        // 0. todo: 限制密码错误次数
        // 1. 传入信息的校验
        if (userLoginDTO == null) return Return.fail(null, Codes.FAIL_LOGIN);

        if (!StringUtils.hasLength(userLoginDTO.getAccount())
                ||!StringUtils.hasLength(userLoginDTO.getPassword())) return Return.fail(null, Codes.FAIL_LOGIN);

        // 2. 检查密码
        UserSessionBO userSessionBO = userService.login(userLoginDTO);
        if(userSessionBO == null) return Return.fail(null, Codes.FAIL_LOGIN);

        // 3. 存储会话
        HttpSession session = request.getSession();
        request.changeSessionId();
        session.setAttribute(Common.USER_SESSION_KEY, userSessionBO);

        UserLoginVO userLoginVO = new UserLoginVO(userSessionBO.getUserAccess()
                ,userSessionBO.getAccount(), userSessionBO.getNickname()
                ,userSessionBO.getAvatar(), userSessionBO.getGrade());
        return Return.success(userLoginVO, Codes.SUCCESS_NORMAL);
    }

    @GetMapping("/userinfo")
    public Return<UserInfoVO> getMeInfo()  {
        UserInfoVO userInfoVO = userService.getMeInfo();
        return userInfoVO == null ? Return.fail(null, Codes.FAIL_NORMAL) : Return.success(userInfoVO, Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/avatar")
    public Return<String> updateAvatar(@RequestParam("file")MultipartFile multipartFile) {
        if (multipartFile.isEmpty()) return Return.fail(null, Codes.FAIL_NORMAL);

        String res = userService.updateAvatar(multipartFile);
        return res == null ? Return.fail(null, Codes.FAIL_NORMAL) : Return.success(res, Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/updateInfo")
    public Return<Boolean> updateInfo(@RequestBody UserUpdateDTO userUpdateVO) {
        if (userUpdateVO == null) return Return.fail(false, Codes.FAIL_NORMAL);
        Boolean res = userService.updateInfo(userUpdateVO);
        return res ? Return.success(res, Codes.SUCCESS_NORMAL) : Return.fail(res, Codes.FAIL_NORMAL);
    }

}
