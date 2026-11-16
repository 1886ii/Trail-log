package org.example.trai.controller.user;

import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.example.trai.common.Common;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.BO.UserSessionBO;
import org.example.trai.entity.DTO.PostGetDTO;
import org.example.trai.entity.DTO.PostGetMeDTO;
import org.example.trai.entity.DTO.PostPublishDTO;
import org.example.trai.entity.DTO.PostUpdateMyDTO;
import org.example.trai.entity.VO.PostGetMeVO;
import org.example.trai.entity.VO.PostGetVO;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.service.PostService;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/user/post")
public class UserPostController {

    @Resource
    private PostService postService;

    @PostMapping("/publish")
    public Return<Object> publishPost(@RequestBody PostPublishDTO postPublishDTO) {
        if (postPublishDTO == null) return Return.fail(null, Codes.FAIL_NORMAL);
        if (postPublishDTO.getPostTagId() == null || postPublishDTO.getPostTagId() <= 0
                || !StringUtils.hasLength(postPublishDTO.getContentDelta())
                || !StringUtils.hasLength(postPublishDTO.getTitle())
                || !StringUtils.hasLength(postPublishDTO.getPlainText())
                || postPublishDTO.getWordCount() == null || postPublishDTO.getWordCount() <= 0
                || postPublishDTO.getVisibility() == null || postPublishDTO.getVisibility() < 0) {
            return Return.fail(null, Codes.FAIL_NORMAL);
        }

        return postService.publishPost(postPublishDTO) ? Return.success(true, Codes.SUCCESS_NORMAL) : Return.fail(false, Codes.FAIL_NORMAL);
    }


    @PostMapping("/list")
    public Return<List<PostGetVO>> getList(@RequestBody PostGetDTO postGetDTO, HttpServletRequest request) {
        if (postGetDTO == null
                || postGetDTO.getSize() == null || postGetDTO.getSize() <= 0 || postGetDTO.getSize() > 50) return Return.fail(null, Codes.FAIL_NORMAL);

        HttpSession session = request.getSession(false);
        Long userId = null;
        UserSessionBO currentUser = (UserSessionBO) session.getAttribute(Common.USER_SESSION_KEY);
        if (currentUser != null) userId = currentUser.getId();

        List<PostGetVO> postGetVOList = postService.getList(postGetDTO, userId);
        return Return.success(postGetVOList, Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/my")
    public Return<PostGetMeVO> getMyPost(@RequestBody PostGetMeDTO postGetMeDTO) {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null || postGetMeDTO == null
                || postGetMeDTO.getSize() == null || postGetMeDTO.getSize() <= 0 || postGetMeDTO.getSize() > 50) {
            return Return.fail(null, Codes.FAIL_NORMAL);
        }


        PostGetMeVO vo = postService.getMyPost(postGetMeDTO, userId);

        return Return.success(vo, Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/delete")
    public Return<Boolean> deleteMyPostById(Long id) {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null || id == null || id <= 0) return Return.fail(false, Codes.FAIL_NORMAL);

        return Return.success(postService.deleteMyPostById(id, userId), Codes.SUCCESS_NORMAL);
    }


    @PostMapping("/update")
    public Return<Object> updateMyPost(@RequestBody PostUpdateMyDTO postUpdateMyDTO) {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null || postUpdateMyDTO.getId() == null || postUpdateMyDTO.getId() <= 0) return Return.fail(null, Codes.FAIL_NORMAL);


        // 除了id不能全部非空
        // 校验：除id之外，不能全部为空
        boolean hasField = postUpdateMyDTO.getPostTagId() != null
                || postUpdateMyDTO.getContentDelta() != null
                || postUpdateMyDTO.getTitle() != null
                || postUpdateMyDTO.getPlainText() != null
                || postUpdateMyDTO.getWordCount() != null
                || postUpdateMyDTO.getCover() != null
                || postUpdateMyDTO.getVisibility() != null;

        if (!hasField) {
            return Return.fail(null, Codes.FAIL_NORMAL);
        }

        if (!(postUpdateMyDTO.getVisibility() != null && (postUpdateMyDTO.getVisibility() == 0 || postUpdateMyDTO.getVisibility() == 1))) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(postService.updateMyPost(postUpdateMyDTO, userId), Codes.SUCCESS_NORMAL);
    }
}
