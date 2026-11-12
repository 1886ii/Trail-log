package org.example.trai.service;

import jakarta.annotation.Resource;
import org.example.trai.entity.PO.PostTagPO;
import org.example.trai.entity.VO.ExamsGetVO;
import org.example.trai.entity.VO.PostTagGetVO;
import org.example.trai.mapper.PostTagMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PostTagService {
    @Resource
    private PostTagMapper postTagMapper;

    public List<PostTagGetVO> getPostTagList() {
        List<PostTagPO> postTagPOS = postTagMapper.queryAll();
        if (postTagPOS.isEmpty()) return null;
        return postTagPOS.stream()
                .map(po -> {
                    PostTagGetVO vo = new PostTagGetVO();
                    BeanUtils.copyProperties(po, vo);
                    return vo;
                })
                .toList();
    }
}
