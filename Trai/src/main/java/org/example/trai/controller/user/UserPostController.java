package org.example.trai.controller.user;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.DTO.PostGetDTO;
import org.example.trai.entity.DTO.PostPublishDTO;
import org.example.trai.entity.VO.PostGetVO;
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
    public Return<List<PostGetVO>> getList(@RequestBody PostGetDTO postGetDTO) {
        if (postGetDTO == null
                || postGetDTO.getSize() == null || postGetDTO.getSize() <= 0 || postGetDTO.getSize() > 50) return Return.fail(null, Codes.FAIL_NORMAL);

        List<PostGetVO> postGetVOList = postService.getList(postGetDTO);
        return Return.success(postGetVOList, Codes.SUCCESS_NORMAL);
    }

}
