package org.example.trai.service;

import jakarta.annotation.Resource;
import org.example.trai.entity.BO.UserInfo4PostBO;
import org.example.trai.entity.DTO.DanmakuAddDTO;
import org.example.trai.entity.PO.DanmakuPO;
import org.example.trai.entity.VO.DanmakuGetListVO;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.mapper.DanmakuMapper;
import org.example.trai.mapper.UserMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class DanmakuService {
    @Resource
    private DanmakuMapper danmakuMapper;

    @Resource
    private UserMapper userMapper;


    public List<DanmakuGetListVO> getDanmakuList(Long bookId) {
        // 1. 查询弹幕
        List<DanmakuGetListVO> vos = new ArrayList<>();
        List<DanmakuPO> danmakuPOS = danmakuMapper.queryByBookId(bookId);
        if (danmakuPOS == null || danmakuPOS.isEmpty()) return vos;

        // 2. 查询用户信息
        List<Long> userIds = danmakuPOS.stream()
                .map(DanmakuPO::getUserId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        List<UserInfo4PostBO> users = userMapper.queryByIdList(userIds);
        Map<Long, UserInfo4PostBO> userMap = users.stream()
                .collect(Collectors.toMap(
                        UserInfo4PostBO::getId,
                        Function.identity(),
                        (k1, k2) -> k1
                ));

        // 3. 组装
        vos = danmakuPOS.stream().map(po -> {
            DanmakuGetListVO vo = new DanmakuGetListVO();
            BeanUtils.copyProperties(po, vo);
            // 填充用户信息
            UserInfo4PostBO user = userMap.get(po.getUserId());
            if (user != null) {
                vo.setNickname(user.getNickname());
                vo.setAvatar(user.getAvatar());
            }
            return vo;
        }).collect(Collectors.toList());

        return vos;
    }

    public Boolean addDanmaku(DanmakuAddDTO danmakuAddDTO) {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null) return false;

        DanmakuPO po = new DanmakuPO();
        BeanUtils.copyProperties(danmakuAddDTO, po);
        po.setUserId(userId);

        return danmakuMapper.insert(po) == 1;
    }
}
