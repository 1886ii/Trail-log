package org.example.trai.service;

import jakarta.annotation.Resource;
import org.example.trai.entity.BO.UserInfo4PostBO;
import org.example.trai.entity.DTO.CommentDTO;
import org.example.trai.entity.DTO.CommentsGetDTO;
import org.example.trai.entity.PO.CommentsPO;
import org.example.trai.entity.VO.CommentsGetVO;
import org.example.trai.entity.VO.ExamsGetVO;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.mapper.CommentsMapper;
import org.example.trai.mapper.PostMapper;
import org.example.trai.mapper.UserMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CommentsService {
    @Resource
    private CommentsMapper commentsMapper;
    @Resource
    private PostMapper postMapper;
    @Resource
    private UserMapper userMapper;

    @Transactional(rollbackFor = Exception.class)
    public Boolean comment(CommentDTO commentDTO) {
        // 1. 获取用户id
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null) return false;

        // 2. 插入评论
        CommentsPO commentsPO = new CommentsPO();
        BeanUtils.copyProperties(commentDTO, commentsPO);
        commentsPO.setUserId(userId);

        if (commentsMapper.insert(commentsPO) != 1) throw new IllegalStateException("评论插入失败");

        // 3. 如果是根评论,则直接插入即可 不是根评论的话 则需要更新 父节点的reply_count
        if (!commentDTO.getRootId().equals(-1L)
                && commentsMapper.updateReplyCountById(commentDTO.getRootId()) != 1) {
            throw new IllegalStateException("回复计数更新失败");   // 触发回滚
        }
        if (postMapper.updateAddCommentCount(commentDTO.getPostId()) != 1) {
            throw new IllegalStateException("评论计数更新失败");   // 触发回滚
        }
        return true;
    }

    @Transactional(rollbackFor = Exception.class)
    public List<CommentsGetVO> getCommentsByPostId(CommentsGetDTO commentsGetDTO) {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null) return null;

        //1. 获得评论
        List<CommentsPO> commentsPOS = commentsMapper.queryByPostId(commentsGetDTO.getPostId());
        if (commentsPOS == null || commentsPOS.isEmpty()) return new ArrayList<>();
        //2. 查询用户信息
        Set<Long> userIdsSet = new HashSet<>();
        for (CommentsPO po : commentsPOS)
            userIdsSet.add(po.getUserId());

        Map<Long, UserInfo4PostBO> userMap = new HashMap<>();
        if (!userIdsSet.isEmpty()) {                                                  // ★ 空集合不查
            List<UserInfo4PostBO> bos = userMapper.queryByIdList(new ArrayList<>(userIdsSet));
            if (bos != null && !bos.isEmpty()) {
                userMap = bos.stream().collect(
                        Collectors.toMap(UserInfo4PostBO::getId, Function.identity(), (k1, k2) -> k1));
            }
        }


        // 3. 组装结果
        List<CommentsGetVO> res = new ArrayList<>();
        for(CommentsPO po : commentsPOS) {
            CommentsGetVO vo = new CommentsGetVO();
            BeanUtils.copyProperties(po, vo);

            UserInfo4PostBO bo = userMap.get(po.getUserId());
            if (bo != null) {
                vo.setAvatar(bo.getAvatar());
                vo.setNickname(bo.getNickname());
                if (bo.getId() != null) vo.setMe(userId.equals(bo.getId()));
            }
            res.add(vo);
        }
        return res;
    }
}
