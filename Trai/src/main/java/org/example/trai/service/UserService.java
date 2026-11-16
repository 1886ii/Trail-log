package org.example.trai.service;

import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.example.trai.entity.BO.UserSessionBO;
import org.example.trai.entity.DTO.UserAddDTO;
import org.example.trai.entity.DTO.UserLoginDTO;
import org.example.trai.entity.DTO.UserUpdateDTO;
import org.example.trai.entity.PO.UserPO;
import org.example.trai.entity.VO.UserInfoVO;
import org.example.trai.interceptor.AdminLoginInterceptor;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.mapper.UserMapper;
import org.example.trai.utils.PasswordUtil;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.StandardOpenOption;

@Slf4j
@Service
public class UserService {
    @Value("${trai.media.save_photo_path}")
    private String savePhotoPath;

    @Value("${trai.media.save_photo_size}")
    private Long savePhotoSize;

    @Resource
    private UserMapper userMapper;

    public UserSessionBO login(UserLoginDTO userLoginDTO) {
        UserPO userPO = userMapper.queryByAccount(userLoginDTO.getAccount());
        if(userPO == null) return null;
        if(!StringUtils.hasLength(userPO.getPassword())) return null;

        UserSessionBO userSessionBO = new UserSessionBO();
        if (!PasswordUtil.matches(userLoginDTO.getPassword(), userPO.getPassword())) {
            // 密码错误
            return null;
        }

        // 修改激活状态
        if (userPO.getState().equals(0)) {
            int res = userMapper.updateState(userPO.getId());
            if (res != 1) {
                log.info("修改用户状态失败");
            }
        }

        userSessionBO.setId(userPO.getId());
        userSessionBO.setAccount(userLoginDTO.getAccount());
        userSessionBO.setNickname(userPO.getNickname());
        userSessionBO.setUserAccess(userPO.getUserAccess());
        userSessionBO.setAvatar(userPO.getAvatar());
        userSessionBO.setGrade(userPO.getGrade());
        return userSessionBO;
    }

    public String addUser(UserAddDTO userAddDTO) {
        UserPO userPO = new UserPO();
        BeanUtils.copyProperties(userAddDTO, userPO);
        userPO.setAdminId(AdminLoginInterceptor.current().getId());
        String password = PasswordUtil.genInitialPassword();
        userPO.setPassword(PasswordUtil.encode(password));

        int insert = userMapper.insert(userPO);

        return insert == 1 ? password : null;
    }

    public UserInfoVO getMeInfo() {
        // 1. 获取当前用户id
        Long id = UserLoginInterceptor.current().getId();
        if (id == null) return null;

        // 2. 查询信息
        UserPO userPO = userMapper.queryMe(id);
        if (userPO == null) return null;

        // 3. 装填对象
        UserInfoVO me = new UserInfoVO();
        BeanUtils.copyProperties(userPO, me);


        me.setActivated(userPO.getState() == 1);
        return me;
    }

    public String updateAvatar(MultipartFile file) {
        // 1. 获取用户account
        String account = UserLoginInterceptor.current().getAccount();
        Long id = UserLoginInterceptor.current().getId();
        if (!StringUtils.hasLength(account) || id == null) return null;

        // 2. 校验必须是图片且小于5MB
        String ct = file.getContentType();
        if (ct == null || !ct.startsWith("image/")) {
            return null;
        }
        if (file.getSize() > savePhotoSize) {
            return null;
        }

        // 3. 转换格式
        BufferedImage src;
        try (InputStream in = file.getInputStream()) {
            src = ImageIO.read(in);
        } catch (IOException e) {
            return null;
        }
        if (src == null) return null;

        // 4. 居中裁成正方形
        int w = src.getWidth(), h = src.getHeight();
        int side = Math.min(w, h);
        BufferedImage square = src.getSubimage((w - side) / 2, (h - side) / 2, side, side);

        // 5. 缩放到 512×512（TYPE_INT_RGB 透明区变黑底；要保透明改 TYPE_INT_ARGB）
        BufferedImage out = new BufferedImage(512, 512, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(square, 0, 0, 512, 512, null);
        g.dispose();



        String root = savePhotoPath;
        if (!root.endsWith("/") && !root.endsWith("\\")) root += "/";


        Path target = Paths.get(root + account + ".png");
        try {
            Files.createDirectories(target.getParent());
            Files.deleteIfExists(target);
            try (OutputStream os = Files.newOutputStream(target,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {
                ImageIO.write(out, "png", os);
            }
        } catch (IOException e) {
            return null;
        }

        return "/media/" + account + ".png";
    }

    public Boolean updateInfo(UserUpdateDTO userUpdateVO) {
        Long id = UserLoginInterceptor.current().getId();
        if (id == null) return false;

        UserPO userPO = new UserPO();
        BeanUtils.copyProperties(userUpdateVO, userPO);
        userPO.setId(id);

        return userMapper.updateInfo(userPO) == 1;
    }
}
