/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const Container = styled.div`
  & + & {
    border-top: 2px dashed #555;
  }
  height: 50vh;
  padding-top: 4rem;
  position: relative;
`;

const Title = styled.h2`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  font-size: 1.2rem;
  height: 4rem;
  background-color: navy;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  padding: 0 0 0 1.4rem;
  font-family: Helvetica;
`;

const Content = styled.div`
  padding: 1rem;
  height: 100%;
  overflow-y: scroll;
`;

const Line = styled.div`
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.8rem;
  margin: 0.3rem 0;
`;

const Terminal = ({ title, lines }) => {
  return (
    <Container>
      <Title>{title}</Title>
      <Content>
        {lines.map((str, index) => (
          <Line key={index}>{str}</Line>
        ))}
      </Content>
    </Container>
  );
};

Terminal.propTypes = {};

export default Terminal;
