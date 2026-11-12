package org.example.trai.controller.user;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.service.LikesService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user/likes")
public class UserLikesController {
    @Resource
    private LikesService likesService;

    @PostMapping("/state")
    public Return<Boolean> getLikeState(Long postId) {
        if (postId == null || postId <= 0) return Return.fail(false, Codes.FAIL_NORMAL);

        return likesService.getLikeState(postId) ? Return.success(true, Codes.SUCCESS_NORMAL) : Return.fail(false, Codes.FAIL_NORMAL);
    }

    @PostMapping("/cancel")
    public Return<Boolean> cancelLike(Long postId) {
        if (postId == null || postId <= 0) return Return.fail(false, Codes.FAIL_NORMAL);

        return likesService.cancelLike(postId) ? Return.success(true, Codes.SUCCESS_NORMAL) : Return.fail(false, Codes.FAIL_NORMAL);
    }

    @PostMapping("/like")
    public Return<Boolean> enterLike(Long postId) {
        if (postId == null || postId <= 0) return Return.fail(false, Codes.FAIL_NORMAL);

        return likesService.enterLike(postId) ? Return.success(true, Codes.SUCCESS_NORMAL) : Return.fail(false, Codes.FAIL_NORMAL);
    }
}
