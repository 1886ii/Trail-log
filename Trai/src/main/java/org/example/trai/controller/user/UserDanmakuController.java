package org.example.trai.controller.user;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.DTO.DanmakuAddDTO;
import org.example.trai.entity.VO.DanmakuGetListVO;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.service.DanmakuService;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/user/danmaku")
public class UserDanmakuController {
    @Resource
    private DanmakuService danmakuService;

    @GetMapping("/list")
    public Return<List<DanmakuGetListVO>> getDanmakuList(Long bookId) {
        if (UserLoginInterceptor.current().getId() == null || bookId == null || bookId <= 0) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(danmakuService.getDanmakuList(bookId), Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/add")
    public Return<Boolean> addDanmaku(@RequestBody DanmakuAddDTO danmakuAddDTO) {
        if (UserLoginInterceptor.current().getId() == null || danmakuAddDTO.getBookId() == null || danmakuAddDTO.getBookId() <= 0
                || !StringUtils.hasLength(danmakuAddDTO.getContent())) return Return.fail(null, Codes.FAIL_NORMAL);


        return Return.success(danmakuService.addDanmaku(danmakuAddDTO), Codes.SUCCESS_NORMAL);
    }
}
