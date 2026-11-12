package org.example.trai.controller.user;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.DTO.CommentDTO;
import org.example.trai.entity.DTO.CommentsGetDTO;
import org.example.trai.entity.VO.CommentsGetVO;
import org.example.trai.service.CommentsService;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/user/comments")
public class CommentsController {
    @Resource
    private CommentsService commentsService;

    @PostMapping("/comment")
    public Return<Boolean> comment(@RequestBody CommentDTO commentDTO) {
        if (commentDTO == null || !StringUtils.hasLength(commentDTO.getContent())
                || commentDTO.getPostId() == null || commentDTO.getPostId() <= 0
                || commentDTO.getRootId() == null || commentDTO.getRootId() < -1
                || commentDTO.getReplyId() == null || commentDTO.getReplyId() < -1
                || commentDTO.getReplyUserId() == null || commentDTO.getReplyUserId() < -1
                || (commentDTO.getRootId() == -1 && (commentDTO.getReplyId() != -1 || commentDTO.getReplyUserId() != -1))
                || (commentDTO.getRootId() != -1 && (commentDTO.getReplyId() == -1 || commentDTO.getReplyUserId() == -1))) {
            return Return.fail(null, Codes.FAIL_NORMAL);
        }

        return commentsService.comment(commentDTO) ? Return.success(true, Codes.SUCCESS_NORMAL) : Return.fail(false, Codes.FAIL_NORMAL);
    }

    @PostMapping("/get")
    public Return<List<CommentsGetVO>> getCommentsByPostId(@RequestBody CommentsGetDTO commentsGetDTO) {
        if (commentsGetDTO == null || commentsGetDTO.getPostId() == null || commentsGetDTO.getPostId() <= 0) return Return.fail(null, Codes.FAIL_NORMAL);

        List<CommentsGetVO> commentsGetVOList = commentsService.getCommentsByPostId(commentsGetDTO);
        return Return.success(commentsGetVOList, Codes.SUCCESS_NORMAL);
    }
}
