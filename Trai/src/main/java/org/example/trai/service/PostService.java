package org.example.trai.service;

import jakarta.annotation.Resource;
import org.example.trai.entity.BO.PostGetMeBO;
import org.example.trai.entity.BO.UserInfo4PostBO;
import org.example.trai.entity.DTO.PostGetDTO;
import org.example.trai.entity.DTO.PostGetMeDTO;
import org.example.trai.entity.DTO.PostPublishDTO;
import org.example.trai.entity.DTO.PostUpdateMyDTO;
import org.example.trai.entity.PO.PostPO;
import org.example.trai.entity.PO.PostTagPO;
import org.example.trai.entity.PO.UserPO;
import org.example.trai.entity.VO.PostGetMeVO;
import org.example.trai.entity.VO.PostGetVO;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.mapper.LikesMapper;
import org.example.trai.mapper.PostMapper;
import org.example.trai.mapper.PostTagMapper;
import org.example.trai.mapper.UserMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class PostService {

    @Resource
    private PostMapper postMapper;
    @Resource
    private UserMapper userMapper;
    @Resource
    private LikesMapper likesMapper;
    @Resource
    private PostTagMapper postTagMapper;

    public Boolean publishPost(PostPublishDTO postPublishDTO) {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null) return false;

        PostPO postPO = new PostPO();
        BeanUtils.copyProperties(postPublishDTO, postPO);
        postPO.setUserId(userId);

        int res = postMapper.insertOne(postPO);
        return res == 1;
    }

    public List<PostGetVO> getList(PostGetDTO postGetDTO, Long userId) {
        // 1. 查询结果
        List<PostPO> postPOS = postMapper.queryByPageSize(postGetDTO, userId);
        // 2. 获取用户信息
        Set<Long> userIdsSet = new HashSet<>();
        for (PostPO po : postPOS)
            userIdsSet.add(po.getUserId());

        List<Long> ids = new ArrayList<>(userIdsSet);
        List<UserInfo4PostBO> userInfo4PostBOS = userMapper.queryByIdList(ids);
        Map<Long, UserInfo4PostBO> userMap = userInfo4PostBOS.stream()
                .collect(Collectors.toMap(UserInfo4PostBO::getId, Function.identity(), (k1, k2) -> k1));

        // 组装tagName 和 likes
        List<PostTagPO> postTagPOS = postTagMapper.queryAll();
        Map<Long, String> tagNameMap = postTagPOS.stream()
                .collect(Collectors.toMap(
                        PostTagPO::getId,
                        tag -> tag.getTagName() == null ? "" : tag.getTagName(),
                        (k1, k2) -> k1
                ));


        // 用户登录状态的时候查询likeState
        Set<Long> likedPostIds = new HashSet<>();
        List<Long> postIds = postPOS.stream().map(PostPO::getId).filter(Objects::nonNull).collect(Collectors.toList());
        if (userId != null && !postIds.isEmpty()) {
            List<Long> hit = likesMapper.queryLikedPostIds(userId, postIds);
            if (hit != null) likedPostIds.addAll(hit);
        }

        // 3. 组装结果
        List<PostGetVO> res = new ArrayList<>();
        for (PostPO po : postPOS) {
            PostGetVO vo = new PostGetVO();
            BeanUtils.copyProperties(po, vo);
            UserInfo4PostBO bo = userMap.get(po.getUserId());
            if (bo != null) {
                vo.setAvatar(bo.getAvatar());
                vo.setNickname(bo.getNickname());
            }

            vo.setLikeState(likedPostIds.contains(po.getId()));
            Long tagId = po.getPostTagId();
            if (tagId != null) {
                vo.setTagName(tagNameMap.get(tagId));
            }
            res.add(vo);
        }
        return res;
    }

    public PostGetMeVO getMyPost(PostGetMeDTO postGetMeDTO, Long userId) {
        // 1. 查询用户信息和myPost
        PostGetMeVO vo = new PostGetMeVO();
        UserPO currentUser = userMapper.queryMe(userId);
        if (currentUser == null) return null;
        vo.setAvatar(currentUser.getAvatar());
        vo.setNickname(currentUser.getNickname());

        List<PostPO> postPOS = postMapper.queryMyByPageSize(postGetMeDTO, userId);
        if (postPOS.isEmpty()) { vo.setMyPosts(new ArrayList<>()); return vo; }

        // 2. 查询like信息
        Set<Long> likedPostIds = new HashSet<>();
        List<Long> postIds = postPOS.stream().map(PostPO::getId).filter(Objects::nonNull).collect(Collectors.toList());
        if (userId != null && !postIds.isEmpty()) {
            List<Long> hit = likesMapper.queryLikedPostIds(userId, postIds);
            if (hit != null) likedPostIds.addAll(hit);
        }

        // 3. 查询tagName信息
        List<PostTagPO> postTagPOS = postTagMapper.queryAll();
        Map<Long, String> tagNameMap = postTagPOS.stream()
                .collect(Collectors.toMap(
                        PostTagPO::getId,
                        tag -> tag.getTagName() == null ? "" : tag.getTagName(),
                        (k1, k2) -> k1
                ));


        // 4. 组装信息
        List<PostGetMeBO> myPosts = new ArrayList<>();
        for (PostPO po : postPOS) {
            PostGetMeBO bo = new PostGetMeBO();
            BeanUtils.copyProperties(po, bo);
            bo.setLikeState(likedPostIds.contains(po.getId()));
            Long tagId = po.getPostTagId();
            if (tagId != null) {
                bo.setTagName(tagNameMap.get(tagId));
            }

            myPosts.add(bo);
        }
        vo.setMyPosts(myPosts);
        return vo;
    }

    public Boolean deleteMyPostById(Long id, Long userId) {
        return postMapper.updateStateById(id, userId) == 1;
    }

    public Boolean updateMyPost(PostUpdateMyDTO postUpdateMyDTO, Long userId) {
        // 1. 更新
        return postMapper.updateMyPostById(postUpdateMyDTO, userId) == 1;
    }
}
